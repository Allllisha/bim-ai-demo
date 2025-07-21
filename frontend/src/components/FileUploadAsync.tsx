import React, { useState, useCallback, useEffect } from 'react';
import { 
  Button, 
  LinearProgress, 
  Typography, 
  Box, 
  Alert,
  CircularProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

interface FileUploadAsyncProps {
  onUploadComplete: (sessionId: string, geometry: any) => void;
}

export const FileUploadAsync: React.FC<FileUploadAsyncProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Poll for upload status
  useEffect(() => {
    if (!sessionId || !processing) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/upload-status/${sessionId}`
        );

        const { status, message, progress, geometry, error } = response.data;
        
        setStatus(message);
        setProgress(progress || 0);

        if (status === 'completed') {
          setProcessing(false);
          onUploadComplete(sessionId, geometry);
          setSessionId(null);
          setFile(null);
        } else if (status === 'failed') {
          setProcessing(false);
          setError(error || 'Failed to process IFC file');
          setSessionId(null);
        }
      } catch (err) {
        console.error('Failed to check status:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [sessionId, processing, onUploadComplete]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
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

      setSessionId(response.data.session_id);
      setProcessing(true);
      setStatus('File uploaded, processing...');
      setUploading(false);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <input
        accept=".ifc"
        style={{ display: 'none' }}
        id="raised-button-file"
        type="file"
        onChange={handleFileChange}
        disabled={uploading || processing}
      />
      <label htmlFor="raised-button-file">
        <Button
          variant="outlined"
          component="span"
          startIcon={<CloudUploadIcon />}
          disabled={uploading || processing}
          fullWidth
        >
          Select IFC File
        </Button>
      </label>
      
      {file && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Selected: {file.name}
        </Typography>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        disabled={!file || uploading || processing}
        fullWidth
        sx={{ mt: 2 }}
      >
        {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Upload'}
      </Button>

      {processing && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {status}
          </Typography>
          {progress > 0 ? (
            <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};