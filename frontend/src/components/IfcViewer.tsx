import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';
import { ViewerCommand } from '../types/ViewerCommand';

interface IfcViewerProps {
  file: File;
  onCommandComplete?: (success: boolean, message?: string) => void;
}

export interface IfcViewerRef {
  executeCommand: (command: ViewerCommand) => Promise<boolean>;
}

interface GeometryData {
  type: string;
  guid: string;
  name: string;
  vertices: number[];
  indices: number[];
}

const IfcViewer = forwardRef<IfcViewerRef, IfcViewerProps>(({ file, onCommandComplete }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const hiddenMeshesRef = useRef<Set<THREE.Mesh>>(new Set());

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
            meshesRef.current.push(mesh);
            originalMaterialsRef.current.set(mesh, material);
          }
        } catch (error) {
          console.warn(`Error processing element ${element.type}:`, error);
        }
      });

      // Store all meshes for command processing
      buildingGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && !meshesRef.current.includes(child)) {
          meshesRef.current.push(child);
          originalMaterialsRef.current.set(child, child.material);
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

  // Command execution logic
  const executeCommand = async (command: ViewerCommand): Promise<boolean> => {
    if (!sceneRef.current) return false;

    try {
      switch (command.type) {
        case 'color':
          return executeColorCommand(command);
        case 'visibility':
          return executeVisibilityCommand(command);
        case 'highlight':
          return executeHighlightCommand(command);
        case 'isolate':
          return executeIsolateCommand(command);
        case 'reset':
          return executeResetCommand(command);
        case 'camera':
          return executeCameraCommand(command);
        case 'transparency':
          return executeTransparencyCommand(command);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error executing viewer command:', error);
      return false;
    }
  };

  const executeColorCommand = (command: ViewerCommand & { type: 'color' }): boolean => {
    const targetMeshes = findTargetMeshes(command.target);
    if (targetMeshes.length === 0) return false;

    const color = new THREE.Color(command.color);
    targetMeshes.forEach(mesh => {
      if (mesh.material instanceof THREE.Material) {
        const newMaterial = (mesh.material as THREE.MeshLambertMaterial).clone();
        newMaterial.color = color;
        mesh.material = newMaterial;
      }
    });

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    return true;
  };

  const executeVisibilityCommand = (command: ViewerCommand & { type: 'visibility' }): boolean => {
    const targetMeshes = findTargetMeshes(command.target);
    if (targetMeshes.length === 0) return false;

    targetMeshes.forEach(mesh => {
      mesh.visible = command.action === 'show';
      if (command.action === 'hide') {
        hiddenMeshesRef.current.add(mesh);
      } else {
        hiddenMeshesRef.current.delete(mesh);
      }
    });

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    return true;
  };

  const executeHighlightCommand = (command: ViewerCommand & { type: 'highlight' }): boolean => {
    const targetMeshes = findTargetMeshes(command.target);
    if (targetMeshes.length === 0) return false;

    // Reset all meshes first
    meshesRef.current.forEach(mesh => {
      const original = originalMaterialsRef.current.get(mesh);
      if (original && mesh.material !== original) {
        mesh.material = original;
      }
    });

    // Highlight target meshes
    const highlightColor = new THREE.Color(command.color || '#ffff00');
    targetMeshes.forEach(mesh => {
      if (mesh.material instanceof THREE.Material) {
        const emissiveMaterial = new THREE.MeshLambertMaterial({
          color: (mesh.material as THREE.MeshLambertMaterial).color,
          emissive: highlightColor,
          emissiveIntensity: 0.5,
          side: THREE.DoubleSide
        });
        mesh.material = emissiveMaterial;
      }
    });

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    return true;
  };

  const executeIsolateCommand = (command: ViewerCommand & { type: 'isolate' }): boolean => {
    const targetMeshes = findTargetMeshes(command.target);
    if (targetMeshes.length === 0) return false;

    meshesRef.current.forEach(mesh => {
      mesh.visible = targetMeshes.includes(mesh);
    });

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    return true;
  };

  const executeResetCommand = (command: ViewerCommand & { type: 'reset' }): boolean => {
    if (!command.aspect || command.aspect === 'all' || command.aspect === 'color') {
      meshesRef.current.forEach(mesh => {
        const original = originalMaterialsRef.current.get(mesh);
        if (original) {
          mesh.material = original;
        }
      });
    }

    if (!command.aspect || command.aspect === 'all' || command.aspect === 'visibility') {
      meshesRef.current.forEach(mesh => {
        mesh.visible = true;
      });
      hiddenMeshesRef.current.clear();
    }

    if (!command.aspect || command.aspect === 'all' || command.aspect === 'camera') {
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(30, 30, 30);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    return true;
  };

  const executeCameraCommand = (command: ViewerCommand & { type: 'camera' }): boolean => {
    if (!cameraRef.current || !controlsRef.current) return false;

    const buildingBounds = new THREE.Box3();
    meshesRef.current.forEach(mesh => {
      if (mesh.visible) {
        buildingBounds.expandByObject(mesh);
      }
    });

    const center = buildingBounds.getCenter(new THREE.Vector3());
    const size = buildingBounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    switch (command.action) {
      case 'top':
        cameraRef.current.position.set(center.x, center.y + maxDim * 2, center.z);
        break;
      case 'front':
        cameraRef.current.position.set(center.x, center.y, center.z + maxDim * 2);
        break;
      case 'side':
        cameraRef.current.position.set(center.x + maxDim * 2, center.y, center.z);
        break;
      case 'isometric':
        cameraRef.current.position.set(
          center.x + maxDim * 1.2,
          center.y + maxDim * 0.8,
          center.z + maxDim * 1.2
        );
        break;
      case 'focus':
        if (command.target) {
          const targetMeshes = findTargetMeshes(command.target);
          if (targetMeshes.length > 0) {
            const targetBounds = new THREE.Box3();
            targetMeshes.forEach(mesh => targetBounds.expandByObject(mesh));
            center.copy(targetBounds.getCenter(new THREE.Vector3()));
          }
        }
        break;
    }

    controlsRef.current.target.copy(center);
    controlsRef.current.update();

    if (rendererRef.current && sceneRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    return true;
  };

  const executeTransparencyCommand = (command: ViewerCommand & { type: 'transparency' }): boolean => {
    const targetMeshes = findTargetMeshes(command.target);
    if (targetMeshes.length === 0) return false;

    targetMeshes.forEach(mesh => {
      if (mesh.material instanceof THREE.Material) {
        const transparentMaterial = (mesh.material as THREE.MeshLambertMaterial).clone();
        transparentMaterial.transparent = true;
        transparentMaterial.opacity = command.opacity;
        mesh.material = transparentMaterial;
      }
    });

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    return true;
  };

  const findTargetMeshes = (target: any): THREE.Mesh[] => {
    return meshesRef.current.filter(mesh => {
      if (hiddenMeshesRef.current.has(mesh) && target.includeHidden !== true) {
        return false;
      }

      const userData = mesh.userData;
      
      if (target.elementType && userData.type) {
        const typeMatch = userData.type.toLowerCase().includes(target.elementType.toLowerCase());
        if (!typeMatch) return false;
      }

      if (target.elementName && userData.name) {
        const nameMatch = userData.name.toLowerCase().includes(target.elementName.toLowerCase());
        if (!nameMatch) return false;
      }

      if (target.material && mesh.material instanceof THREE.Material) {
        const materialName = (mesh.material as any).name || '';
        const materialMatch = materialName.toLowerCase().includes(target.material.toLowerCase());
        if (!materialMatch) return false;
      }

      return true;
    });
  };

  // Expose commands via ref
  useImperativeHandle(ref, () => ({
    executeCommand
  }));

  // Upload and process IFC file
  useEffect(() => {
    const uploadIFC = async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/upload_ifc`,
          formData
        );
        
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

    // Store container reference for cleanup
    const container = containerRef.current;
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
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
});

IfcViewer.displayName = 'IfcViewer';

export default IfcViewer;