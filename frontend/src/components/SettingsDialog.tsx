import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Chip
} from '@mui/material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ProviderStatus {
  current_provider: string;
  available_providers: string[];
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const [provider, setProvider] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProviderStatus();
    }
  }, [open]);

  const fetchProviderStatus = async () => {
    try {
      const response = await axios.get<ProviderStatus>(`${API_URL}/llm-provider`);
      setProvider(response.data.current_provider);
      setAvailableProviders(response.data.available_providers);
    } catch (err) {
      setError('Failed to fetch provider settings');
      console.error('Error fetching provider settings:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await axios.post(`${API_URL}/llm-provider`, { provider });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update provider');
      console.error('Error updating provider:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProviderLabel = (value: string) => {
    switch (value) {
      case 'openai':
        return 'OpenAI GPT-4o';
      case 'anthropic':
        return 'Anthropic Claude';
      default:
        return value;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Settings
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend" sx={{ mb: 2, color: 'text.primary' }}>
              AI Provider
            </FormLabel>
            <RadioGroup
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <FormControlLabel
                value="openai"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{getProviderLabel('openai')}</span>
                    {!availableProviders.includes('openai') && (
                      <Chip label="Not configured" size="small" color="default" />
                    )}
                  </Box>
                }
                disabled={!availableProviders.includes('openai')}
              />
              <FormControlLabel
                value="anthropic"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{getProviderLabel('anthropic')}</span>
                    {!availableProviders.includes('anthropic') && (
                      <Chip label="Not configured" size="small" color="default" />
                    )}
                  </Box>
                }
                disabled={!availableProviders.includes('anthropic')}
              />
            </RadioGroup>
          </FormControl>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Provider updated successfully!
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || availableProviders.length === 0}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;