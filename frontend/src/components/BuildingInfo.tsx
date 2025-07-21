import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';

interface BuildingInfoProps {
  sessionId: string;
}

interface BuildingData {
  building: {
    name: string;
    description: string;
    guid: string;
  } | null;
  floors: {
    count: number;
    names: string[];
    elevations: number[];
  };
  spaces: {
    count: number;
    names: string[];
  };
  windows: {
    count: number;
  };
  doors: {
    count: number;
  };
  structural_elements: {
    count: number;
  };
  all_elements: Array<{
    labels: string[];
    count: number;
  }>;
  materials: {
    count: number;
    names: string[];
  };
  capabilities: {
    available_questions: string[];
    limitations: string[];
    data_quality: Record<string, boolean>;
  };
}

// Helper function to get user-friendly element names
const getElementDisplayName = (elementType: string): string => {
  const typeMapping: { [key: string]: string } = {
    'IfcWindow': 'Window (窓)',
    'IfcDoor': 'Door (ドア)', 
    'IfcWall': 'Wall (壁)',
    'IfcSlab': 'Slab (床)',
    'IfcColumn': 'Column (柱)',
    'IfcBeam': 'Beam (梁)',
    'IfcRoof': 'Roof (屋根)',
    'IfcStair': 'Stair (階段)',
    'IfcRailing': 'Railing (手すり)',
    'IfcSpace': 'Space (空間)',
    'IfcBuildingStorey': 'Floor (階)',
    'IfcBuilding': 'Building (建物)',
    'IfcFurnishingElement': 'Furniture (家具)',
    'IfcBuildingElementProxy': 'Building Element (建築要素)',
    'IfcFlowSegment': 'Pipe/Duct (配管・ダクト)',
    'IfcFlowTerminal': 'Equipment (設備機器)',
    'IfcFlowFitting': 'Fitting (継手)',
    'IfcEnergyConversionDevice': 'HVAC Equipment (空調設備)',
    'IfcTransportElement': 'Transport (輸送設備)',
    'IfcSystemFurnitureElement': 'System Furniture (システム家具)'
  };

  // Try exact match first
  if (typeMapping[elementType]) {
    return typeMapping[elementType];
  }

  // Try to remove Ifc prefix and make it more readable
  const withoutIfc = elementType.replace(/^Ifc/, '');
  
  // Add spaces before capital letters
  const withSpaces = withoutIfc.replace(/([A-Z])/g, ' $1').trim();
  
  return withSpaces || elementType;
};

const BuildingInfo: React.FC<BuildingInfoProps> = ({ sessionId }) => {
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildingInfo = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/building-info/${sessionId}`
        );
        setBuildingData(response.data.building_info);
      } catch (error) {
        console.error('Error fetching building info:', error);
        setError('建物情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchBuildingInfo();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!buildingData) {
    return null;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid', 
        borderColor: 'grey.200',
        bgcolor: 'background.paper',
        flexShrink: 0
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          Building Analysis
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Comprehensive IFC data summary and insights
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
      
      <Grid container spacing={2}>
        {/* 基本情報 */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="overline" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  mb: 2,
                  display: 'block'
                }}
              >
                BUILDING INFORMATION
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    Name
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {buildingData.building?.name === '// BUILDING/NAME //' || !buildingData.building?.name 
                      ? 'Not specified' 
                      : buildingData.building.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {buildingData.building?.description || 'Not available'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 建物構成要素 */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="overline" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  mb: 3,
                  display: 'block'
                }}
              >
                BUILDING COMPOSITION
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main', mb: 0.5 }}>
                      {buildingData.floors.count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                      Floors
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main', mb: 0.5 }}>
                      {buildingData.spaces.count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                      Spaces
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main', mb: 0.5 }}>
                      {buildingData.windows.count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                      Windows
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main', mb: 0.5 }}>
                      {buildingData.doors.count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                      Doors
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main', mb: 0.5 }}>
                      {buildingData.materials?.count || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                      Materials
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 全要素の詳細 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                IFC要素一覧
              </Typography>
              <List dense>
                {buildingData.all_elements.map((element, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">
                            {getElementDisplayName(element.labels[0] || '')}
                          </Typography>
                          <Chip label={element.count} size="small" variant="outlined" />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 材質一覧 */}
        {buildingData.materials && buildingData.materials.count > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  材質一覧 ({buildingData.materials.count}種類)
                </Typography>
                <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {buildingData.materials.names.map((materialName, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            {materialName || `Material ${index + 1}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

      </Grid>
      </Box>
    </Box>
  );
};

export default BuildingInfo;