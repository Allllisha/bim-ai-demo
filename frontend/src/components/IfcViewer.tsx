import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';

interface IfcViewerProps {
  file: File;
}

interface GeometryData {
  type: string;
  guid: string;
  name: string;
  vertices: number[];
  indices: number[];
}

const IfcViewer: React.FC<IfcViewerProps> = ({ file }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Function to load actual IFC geometry
  const loadGeometry = (geometryData: GeometryData[]) => {
    if (!sceneRef.current) return;
    
    try {
      const buildingGroup = new THREE.Group();

      geometryData.forEach((element, index) => {
        try {
          if (element.vertices && element.indices && element.vertices.length > 0) {
            const geometry = new THREE.BufferGeometry();
            
            // Set vertices
            const vertices = new Float32Array(element.vertices);
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            
            // Set indices if available
            if (element.indices.length > 0) {
              const indices = new Uint32Array(element.indices);
              geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            }
            
            geometry.computeVertexNormals();

            // Create material based on element type
            let color = 0x808080;
            if (element.type.includes('Wall')) color = 0xF5F5DC;
            else if (element.type.includes('Slab')) color = 0xE0E0E0;
            else if (element.type.includes('Column')) color = 0x808080;
            else if (element.type.includes('Window')) color = 0x87CEEB;
            else if (element.type.includes('Door')) color = 0x8B4513;

            const material = new THREE.MeshLambertMaterial({ 
              color: color,
              side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = {
              type: element.type,
              guid: element.guid,
              name: element.name
            };

            buildingGroup.add(mesh);
          }
        } catch (error) {
          console.warn(`Error processing element ${element.type}:`, error);
        }
      });

      // Fix IFC coordinate system - rotate building to correct orientation
      buildingGroup.rotation.x = -Math.PI / 2; // Rotate -90 degrees around X axis
      
      sceneRef.current.add(buildingGroup);

      // Center the view
      const box = new THREE.Box3().setFromObject(buildingGroup);
      if (!box.isEmpty() && cameraRef.current && controlsRef.current) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0) {
          cameraRef.current.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.2);
          cameraRef.current.lookAt(center);
          controlsRef.current.target.copy(center);
          controlsRef.current.update();
        }
      }

      setLoading(false);
      console.log(`Loaded ${geometryData.length} IFC elements`);

    } catch (error) {
      console.error('Error loading IFC geometry:', error);
      setError('3Dモデルの表示に失敗しました');
      setLoading(false);
    }
  };

  // Fallback building if IFC processing fails
  const loadFallbackBuilding = () => {
    if (!sceneRef.current) return;
    
    const buildingGroup = new THREE.Group();

    // Simple building representation
    const buildingGeometry = new THREE.BoxGeometry(20, 15, 20);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xE0E0E0 });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = 7.5;
    buildingGroup.add(building);

    // Add some windows
    for (let i = 0; i < 4; i++) {
      const windowGeometry = new THREE.BoxGeometry(2, 1.5, 0.2);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      
      const angle = i * Math.PI / 2;
      window.position.set(
        Math.cos(angle) * 10.2,
        8,
        Math.sin(angle) * 10.2
      );
      window.rotation.y = angle;
      buildingGroup.add(window);
    }

    sceneRef.current.add(buildingGroup);

    // Center view
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(40, 30, 40);
      cameraRef.current.lookAt(0, 7.5, 0);
      controlsRef.current.update();
    }

    setLoading(false);
    console.log('Loaded fallback building');
  };

  // Upload and process IFC file
  useEffect(() => {
    const uploadIFC = async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/upload_ifc`,
          formData
        );
        
        setSessionId(response.data.session_id);
        console.log('IFC file uploaded successfully');
        console.log('Received geometry data:', response.data.geometry);
        
        // Load 3D geometry
        if (response.data.geometry && response.data.geometry.length > 0) {
          console.log(`Loading ${response.data.geometry.length} geometry elements`);
          loadGeometry(response.data.geometry);
        } else {
          console.log('No geometry data received, loading fallback');
          loadFallbackBuilding();
        }
        
      } catch (error) {
        console.error('Error uploading IFC file:', error);
        setError('IFCファイルのアップロードに失敗しました');
        loadFallbackBuilding();
      }
    };

    uploadIFC();
  }, [file]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(30, 30, 30);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 50);
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }} 
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress />
          <Typography>IFCファイルを処理中...</Typography>
        </Box>
      )}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}
        >
          <Typography color="error">{error}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default IfcViewer;