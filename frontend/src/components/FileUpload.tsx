import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  alpha,
  Chip
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';

interface FileUploadProps {
  onUploadSuccess: (sessionId: string, file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!file.name.endsWith('.ifc')) {
      setError('Only IFC files are supported (.ifc extension required)');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/upload_ifc`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      onUploadSuccess(response.data.session_id, file);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        elevation={0}
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 6,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          bgcolor: dragOver ? alpha('#1B365D', 0.04) : 'transparent',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: alpha('#1B365D', 0.02),
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".ifc"
          onChange={handleInputChange}
        />

        <Box sx={{ mb: 3 }}>
          <CloudUploadIcon 
            sx={{ 
              fontSize: 48, 
              color: 'primary.main',
              mb: 2
            }} 
          />
        </Box>

        <Typography 
          variant="h6" 
          sx={{ 
            mb: 1, 
            fontWeight: 500,
            color: 'text.primary'
          }}
        >
          Upload IFC File
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 3,
            color: 'text.secondary'
          }}
        >
          Drag and drop your IFC file here, or click to select
        </Typography>

        {!loading && (
          <Button
            variant="contained"
            startIcon={<FolderOpenIcon />}
            sx={{ 
              textTransform: 'none',
              px: 4,
              py: 1.5
            }}
          >
            Select File
          </Button>
        )}

        {loading && (
          <Box sx={{ width: '100%', maxWidth: 300, mx: 'auto' }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Processing IFC file...
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </Paper>

      {/* File Info */}
      <Box sx={{ mt: 3 }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            display: 'block',
            mb: 2
          }}
        >
          SUPPORTED FORMAT
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            icon={<DescriptionIcon />} 
            label="IFC (.ifc)" 
            size="small"
            variant="outlined"
            sx={{ 
              borderColor: 'primary.main',
              color: 'primary.main'
            }}
          />
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 3,
            borderRadius: 2
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload;