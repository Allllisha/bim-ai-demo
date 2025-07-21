from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
from pathlib import Path
import aiofiles
from dotenv import load_dotenv

from ifc_parser import parse_ifc_to_neo4j
from neo4j_service import Neo4jService
from claude_service import ClaudeService

load_dotenv()

app = FastAPI(title="BIM × AI Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

neo4j_service = Neo4jService()
claude_service = ClaudeService()


async def analyze_ifc_capabilities_with_ai(building_info: dict, claude_service) -> dict:
    """Generate comprehensive analysis capabilities based on available IFC data"""
    
    # Check what data is available
    has_furniture = any(elem.get('labels', [''])[0] in ['IfcFurnishingElement', 'IfcFurniture'] 
                       for elem in building_info.get('all_elements', []))
    has_spaces = building_info.get('spaces', {}).get('count', 0) > 0
    has_floors = building_info.get('floors', {}).get('count', 0) > 0
    has_windows = building_info.get('windows', {}).get('count', 0) > 0
    has_doors = building_info.get('doors', {}).get('count', 0) > 0
    has_building_elements = any(elem.get('labels', [''])[0] in ['IfcWall', 'IfcColumn', 'IfcBeam', 'IfcSlab', 'IfcBuildingElementProxy'] 
                               for elem in building_info.get('all_elements', []))
    
    # Enhanced capabilities list based on implemented features
    available_questions = [
        "この建物の基本構成を分析してください",
        "エネルギー効率と省エネ性能を評価してください",
        "建築基準法・法規制への適合性をチェック",
        "設計の改善提案をお願いします",
        "コスト分析と投資効果を評価",
        "空間利用の最適化について提案",
        "建物の用途と設計意図を分析",
        "維持管理・運用面での提案"
    ]
    
    # Add specific questions based on available data
    if has_furniture and has_floors:
        available_questions.extend([
            "1階の家具の数と配置について",
            "2階の家具の数と配置について",
            "家具レイアウトの最適化提案"
        ])
    
    if has_spaces:
        available_questions.extend([
            "各空間の用途別分析",
            "動線計画の評価と改善"
        ])
    
    if has_windows and has_doors:
        available_questions.extend([
            "自然採光と通風の効率性",
            "開口部の配置最適化"
        ])
    
    if has_building_elements:
        available_questions.extend([
            "構造要素の配置と効率性",
            "耐震性能の評価"
        ])
    
    # Limitations based on IFC data structure
    limitations = []
    
    if not has_furniture:
        limitations.append("家具情報が不足しているため、詳細なレイアウト分析に制限があります")
    
    if building_info.get('floors', {}).get('count', 0) <= 1:
        limitations.append("単層建物のため、階層別分析は限定的です")
    
    if not has_building_elements:
        limitations.append("詳細な構造要素情報が不足している可能性があります")
    
    # Data quality assessment
    data_quality = {
        "basic_structure": has_floors and has_spaces,
        "openings": has_windows and has_doors,
        "furniture": has_furniture,
        "building_elements": has_building_elements,
        "spatial_relationships": has_spaces and has_floors
    }
    
    return {
        "available_questions": available_questions,
        "limitations": limitations if limitations else ["特に制限はありません。包括的な分析が可能です。"],
        "data_quality": data_quality
    }


class ChatRequest(BaseModel):
    session_id: str
    question: str
    conversation_history: list = []  # 会話履歴を追加


class ChatResponse(BaseModel):
    response: str


@app.on_event("startup")
async def startup_event():
    neo4j_service.verify_connection()


@app.on_event("shutdown")
async def shutdown_event():
    neo4j_service.close()


@app.post("/upload_ifc")
async def upload_ifc(file: UploadFile = File(...)):
    if not file.filename.endswith('.ifc'):
        raise HTTPException(status_code=400, detail="Only IFC files are allowed")
    
    session_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{session_id}_{file.filename}"
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    try:
        geometry_data = parse_ifc_to_neo4j(str(file_path), session_id, neo4j_service)
        return {
            "session_id": session_id,
            "geometry": geometry_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse IFC file: {str(e)}")


@app.get("/geometry/{session_id}")
async def get_geometry(session_id: str):
    """Get 3D geometry data for visualization"""
    try:
        # Get simplified geometry from Neo4j for 3D visualization
        result = neo4j_service.execute_query("""
            MATCH (e) WHERE e.session_id = $session_id AND e.geometry IS NOT NULL
            RETURN e.type as element_type, e.name as name, e.guid as guid, 
                   e.geometry as geometry, e.material as material
            LIMIT 1000
        """, {"session_id": session_id})
        
        return {"geometry_data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get geometry: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Generate Cypher query
        cypher_query = await claude_service.generate_cypher(request.question, request.session_id)
        
        # Execute the query
        result = neo4j_service.execute_query(cypher_query, {"session_id": request.session_id})
        
        # Generate natural language response with conversation history
        natural_response = await claude_service.generate_natural_response(
            request.question, 
            result, 
            request.conversation_history
        )
        
        return ChatResponse(response=natural_response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


@app.get("/building-info/{session_id}")
async def get_building_info(session_id: str):
    """Get comprehensive building information summary"""
    try:
        # Get all available information from the database
        info = {}
        
        # Building basic info
        buildings = neo4j_service.execute_query("""
            MATCH (b:IfcBuilding) WHERE b.session_id = $session_id 
            RETURN b.name as name, b.description as description, b.guid as guid
        """, {"session_id": session_id})
        info["building"] = buildings[0] if buildings else None
        
        # Count of floors
        floors = neo4j_service.execute_query("""
            MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id 
            RETURN count(s) as count, collect(s.name) as names, collect(s.elevation) as elevations
        """, {"session_id": session_id})
        info["floors"] = floors[0] if floors else {"count": 0}
        
        # Count of spaces/rooms
        spaces = neo4j_service.execute_query("""
            MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id 
            RETURN count(sp) as count, collect(sp.name) as names
        """, {"session_id": session_id})
        info["spaces"] = spaces[0] if spaces else {"count": 0}
        
        # Count of windows
        windows = neo4j_service.execute_query("""
            MATCH (w:IfcWindow) WHERE w.session_id = $session_id 
            RETURN count(w) as count
        """, {"session_id": session_id})
        info["windows"] = windows[0] if windows else {"count": 0}
        
        # Count of doors
        doors = neo4j_service.execute_query("""
            MATCH (d:IfcDoor) WHERE d.session_id = $session_id 
            RETURN count(d) as count
        """, {"session_id": session_id})
        info["doors"] = doors[0] if doors else {"count": 0}
        
        # Count of structural elements
        elements = neo4j_service.execute_query("""
            MATCH (e:IfcBuildingElementProxy) WHERE e.session_id = $session_id 
            RETURN count(e) as count
        """, {"session_id": session_id})
        info["structural_elements"] = elements[0] if elements else {"count": 0}
        
        # All node types summary - use element_type when available, otherwise use primary label
        node_types = neo4j_service.execute_query("""
            MATCH (n) WHERE n.session_id = $session_id 
            WITH n, 
                 CASE 
                     WHEN n.element_type IS NOT NULL THEN n.element_type
                     ELSE labels(n)[0]
                 END as element_type
            RETURN element_type, count(n) as count 
            ORDER BY count DESC
        """, {"session_id": session_id})
        
        # Format the results to match the expected structure
        formatted_elements = []
        for item in node_types:
            formatted_elements.append({
                "labels": [item["element_type"]],
                "count": item["count"]
            })
        info["all_elements"] = formatted_elements
        
        # Remove capabilities analysis (not needed in UI anymore)
        
        return {"session_id": session_id, "building_info": info}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get building info: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}