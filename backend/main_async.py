from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
import uuid
import aiofiles
from typing import Dict, Any, Optional
import logging

from neo4j_service import Neo4jService
from ifc_parser import parse_ifc_to_neo4j
from claude_service import ClaudeService
from pydantic import BaseModel

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
neo4j_service = Neo4jService()
claude_service = ClaudeService()

# Upload directory
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory status tracking (could use Redis in production)
upload_status: Dict[str, Dict[str, Any]] = {}

class UploadStatus(BaseModel):
    session_id: str
    status: str  # "processing", "completed", "failed"
    message: str
    progress: Optional[int] = None
    geometry_data: Optional[dict] = None
    error: Optional[str] = None

async def parse_ifc_background(file_path: Path, session_id: str, neo4j_service: Neo4jService):
    """Background task to parse IFC file"""
    try:
        # Update status to processing
        upload_status[session_id] = {
            "status": "processing",
            "message": "Parsing IFC file...",
            "progress": 0
        }
        
        # Parse IFC file
        geometry_data = parse_ifc_to_neo4j(str(file_path), session_id, neo4j_service)
        
        # Update status to completed
        upload_status[session_id] = {
            "status": "completed",
            "message": "IFC file parsed successfully",
            "progress": 100,
            "geometry_data": geometry_data
        }
        
        logger.info(f"Successfully parsed IFC file for session {session_id}")
        
    except Exception as e:
        logger.error(f"Failed to parse IFC file for session {session_id}: {str(e)}")
        upload_status[session_id] = {
            "status": "failed",
            "message": "Failed to parse IFC file",
            "error": str(e)
        }

@app.post("/upload_ifc")
async def upload_ifc(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload IFC file and process in background"""
    if not file.filename.endswith('.ifc'):
        raise HTTPException(status_code=400, detail="Only IFC files are allowed")
    
    try:
        # Generate session ID
        session_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{session_id}_{file.filename}"
        
        # Save file asynchronously
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Initialize status
        upload_status[session_id] = {
            "status": "queued",
            "message": "File uploaded, waiting to process...",
            "progress": 0
        }
        
        # Add parsing task to background
        background_tasks.add_task(
            parse_ifc_background,
            file_path,
            session_id,
            neo4j_service
        )
        
        return {
            "session_id": session_id,
            "status": "processing",
            "message": "File uploaded successfully, processing in background"
        }
        
    except Exception as e:
        logger.error(f"Failed to upload file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/upload-status/{session_id}")
async def get_upload_status(session_id: str):
    """Get the status of an upload"""
    if session_id not in upload_status:
        raise HTTPException(status_code=404, detail="Session not found")
    
    status_data = upload_status[session_id].copy()
    
    # If completed, include geometry data
    if status_data["status"] == "completed" and "geometry_data" in status_data:
        return {
            "session_id": session_id,
            "status": status_data["status"],
            "message": status_data["message"],
            "progress": status_data["progress"],
            "geometry": status_data["geometry_data"]
        }
    else:
        return {
            "session_id": session_id,
            "status": status_data["status"],
            "message": status_data["message"],
            "progress": status_data.get("progress", 0),
            "error": status_data.get("error")
        }

# Keep existing endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# ... (rest of the existing endpoints remain the same)