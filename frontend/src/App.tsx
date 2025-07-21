import React, { useState, useCallback } from 'react';
import { 
  Grid, 
  Paper, 
  AppBar, 
  Toolbar, 
  Typography,
  Box,
  Tabs,
  Tab,
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import FileUpload from './components/FileUpload';
import IfcViewer from './components/IfcViewer';
import ChatInterface from './components/ChatInterface';
import BuildingInfo from './components/BuildingInfo';
import architecturalTheme from './theme';
import './App.css';

interface AppState {
  sessionId: string | null;
  ifcFile: File | null;
}

function App() {
  const [state, setState] = useState<AppState>({
    sessionId: null,
    ifcFile: null
  });
  const [tabValue, setTabValue] = useState(0);

  const handleFileUpload = useCallback((sessionId: string, file: File) => {
    setState({
      sessionId,
      ifcFile: file
    });
  }, []);

  return (
    <ThemeProvider theme={architecturalTheme}>
      <CssBaseline />
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}>
        {/* Professional Header */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            bgcolor: 'background.paper',
            color: 'text.primary'
          }}
        >
          <Toolbar sx={{ minHeight: '64px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Box 
                sx={{ 
                  width: 8, 
                  height: 32, 
                  bgcolor: 'primary.main', 
                  mr: 2,
                  borderRadius: 1
                }} 
              />
              <Typography 
                variant="h5" 
                component="div" 
                sx={{ 
                  fontWeight: 300,
                  letterSpacing: '-0.01em',
                  color: 'primary.main'
                }}
              >
                BIM Intelligence Platform
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.8rem',
                letterSpacing: '0.05em'
              }}
            >
              Powered by AICE
            </Typography>
          </Toolbar>
        </AppBar>
        
        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          {!state.sessionId ? (
            /* Upload State - Full Screen Professional Layout */
            <Box sx={{ 
              width: '100%', 
              display: 'flex',
              bgcolor: 'grey.50'
            }}>
              {/* Left Panel - Upload */}
              <Box sx={{ 
                width: '50%', 
                p: 6, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'background.paper'
              }}>
                <Box sx={{ maxWidth: 480, width: '100%' }}>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 300,
                      color: 'primary.main',
                      lineHeight: 1.2
                    }}
                  >
                    Digital Building
                    <br />
                    Intelligence
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mb: 4, 
                      color: 'text.secondary',
                      lineHeight: 1.7
                    }}
                  >
                    AIを活用した建築情報モデリング（BIM）解析プラットフォーム。
                    IFCファイルから建物の特性を分析し、専門的な洞察を提供します。
                  </Typography>
                  <FileUpload onUploadSuccess={handleFileUpload} />
                </Box>
              </Box>
              
              {/* Right Panel - Preview/Info */}
              <Box sx={{ 
                width: '50%', 
                bgcolor: 'grey.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ textAlign: 'center', zIndex: 2 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      mb: 3, 
                      fontWeight: 300,
                      color: 'text.secondary'
                    }}
                  >
                    3D Visualization
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: 'text.secondary',
                      maxWidth: 320,
                      lineHeight: 1.6
                    }}
                  >
                    高精度な3Dビューワーで建物構造を可視化し、
                    AIによる包括的な建築分析を実行します。
                  </Typography>
                </Box>
                
                {/* Subtle Grid Pattern */}
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.1,
                  backgroundImage: 'linear-gradient(#1B365D 1px, transparent 1px), linear-gradient(90deg, #1B365D 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }} />
              </Box>
            </Box>
          ) : (
            /* Analysis State - Side by Side Layout */
            <Grid container sx={{ height: '100%' }}>
              {/* 3D Viewer */}
              <Grid item xs={12} md={8} sx={{ height: '100%' }}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    height: '100%', 
                    border: '1px solid',
                    borderColor: 'grey.200',
                    borderRadius: 0,
                    bgcolor: 'background.paper'
                  }}
                >
                  <IfcViewer file={state.ifcFile!} />
                </Paper>
              </Grid>
              
              {/* Analysis Panel */}
              <Grid item xs={12} md={4} sx={{ height: '100%' }}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    borderLeft: 0,
                    borderRadius: 0,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <Box sx={{ 
                    borderBottom: '1px solid',
                    borderColor: 'grey.200',
                    bgcolor: 'grey.50',
                    flexShrink: 0
                  }}>
                    <Tabs 
                      value={tabValue} 
                      onChange={(_, newValue) => setTabValue(newValue)}
                      variant="fullWidth"
                      sx={{
                        '& .MuiTab-root': {
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: '0.875rem'
                        }
                      }}
                    >
                      <Tab label="Building Analysis" />
                      <Tab label="AI Consultant" />
                    </Tabs>
                  </Box>
                  <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Box sx={{ 
                      height: '100%',
                      display: tabValue === 0 ? 'block' : 'none',
                      overflow: 'auto'
                    }}>
                      <BuildingInfo sessionId={state.sessionId} />
                    </Box>
                    <Box sx={{ 
                      height: '100%',
                      display: tabValue === 1 ? 'block' : 'none'
                    }}>
                      <ChatInterface sessionId={state.sessionId} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;