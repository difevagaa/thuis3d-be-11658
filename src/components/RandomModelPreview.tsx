import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface RandomModelPreviewProps {
  color: string;
  className?: string;
}

export function RandomModelPreview({ color, className = "" }: RandomModelPreviewProps) {
  const { t } = useTranslation('common');
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentModel, setCurrentModel] = useState<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    mesh?: THREE.Group;
    animationId?: number;
    initialCameraPosition?: THREE.Vector3;
    initialMeshRotation?: THREE.Euler;
  }>({});

  // Load random model on mount
  const loadRandomModel = useCallback(async () => {
    const { data } = await supabase
      .from('preview_3d_models')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (data && data.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.length);
      setCurrentModel(data[randomIndex]);
    }
  }, []);

  useEffect(() => {
    loadRandomModel();
  }, [loadRandomModel]);

  // Zoom controls
  const handleZoom = useCallback((delta: number) => {
    if (!sceneRef.current.camera) return;
    
    const newZoom = Math.max(0.5, Math.min(2, zoomLevel + delta));
    setZoomLevel(newZoom);
    
    const baseDistance = 3;
    const newZ = baseDistance / newZoom;
    sceneRef.current.camera.position.z = newZ;
  }, [zoomLevel]);

  // Reset view
  const handleResetView = useCallback(() => {
    if (!sceneRef.current.camera || !sceneRef.current.mesh || 
        !sceneRef.current.initialCameraPosition || !sceneRef.current.initialMeshRotation) return;
    
    sceneRef.current.camera.position.copy(sceneRef.current.initialCameraPosition);
    sceneRef.current.mesh.rotation.copy(sceneRef.current.initialMeshRotation);
    setZoomLevel(1);
    setAutoRotate(true);
  }, []);

  // Change model
  const handleChangeModel = useCallback(() => {
    loadRandomModel();
  }, [loadRandomModel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !currentModel) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    const initialCameraPosition = new THREE.Vector3(0, 1, 3);
    camera.position.copy(initialCameraPosition);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Enhanced Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-5, 3, -5);
    scene.add(directionalLight2);

    // Create model based on type
    const modelGroup = createModel(currentModel.vertices_data.type, color);
    const initialMeshRotation = modelGroup.rotation.clone();
    scene.add(modelGroup);

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      mesh: modelGroup,
      initialCameraPosition: initialCameraPosition.clone(),
      initialMeshRotation: initialMeshRotation.clone(),
    };

    // Mouse interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = () => {
      isDragging = true;
      setAutoRotate(false);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sceneRef.current.mesh) return;

      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y,
      };

      sceneRef.current.mesh.rotation.y += deltaMove.x * 0.01;
      sceneRef.current.mesh.rotation.x += deltaMove.y * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Wheel zoom support
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      
      if (sceneRef.current.camera) {
        const currentZ = sceneRef.current.camera.position.z;
        const newZ = Math.max(1.5, Math.min(6, currentZ - delta * 2));
        sceneRef.current.camera.position.z = newZ;
        setZoomLevel(3 / newZ);
      }
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // Animation loop
    const animationAutoRotate = autoRotate;
    
    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate);
      
      // Auto-rotate slowly when enabled and not dragging
      if (animationAutoRotate && !isDragging && sceneRef.current.mesh) {
        sceneRef.current.mesh.rotation.y += 0.005;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      // Use captured container variable for cleanup
      if (container?.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [currentModel, color]);

  // Update color when it changes
  useEffect(() => {
    if (sceneRef.current.mesh) {
      const newColor = new THREE.Color(color);
      sceneRef.current.mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
          child.material.color = newColor;
        }
      });
    }
  }, [color]);

  if (!currentModel) {
    return (
      <div className={className}>
        <div className="w-full h-64 rounded-lg border bg-muted/30 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('viewer3d.loadingPreview')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Control buttons */}
      <div className="flex justify-center gap-1 mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleZoom(0.2)}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('viewer3d.zoomIn')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleZoom(-0.2)}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('viewer3d.zoomOut')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleResetView}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('viewer3d.resetView')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleChangeModel}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('viewer3d.changeModel')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 3D Canvas container */}
      <div 
        ref={containerRef} 
        className="w-full h-56 rounded-lg border bg-muted/30 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />
      
      {/* Instructions */}
      <div className="text-xs text-center text-muted-foreground mt-2">
        <p className="font-medium">{t('viewer3d.colorPreview')}: {currentModel.name}</p>
        <p>{t('viewer3d.dragToRotate')} • {t('viewer3d.wheelToZoom')}</p>
      </div>
    </div>
  );
}

// Funciones para crear diferentes modelos 3D
function createModel(type: string, color: string): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({ 
    color: new THREE.Color(color),
    shininess: 30
  });

  switch (type) {
    case 'duck':
      return createDuck(material);
    case 'cat':
      return createCat(material);
    case 'rabbit':
      return createRabbit(material);
    case 'bear':
      return createBear(material);
    case 'robot':
      return createRobot(material);
    case 'astronaut':
      return createAstronaut(material);
    case 'ninja':
      return createNinja(material);
    case 'mug':
      return createMug(material);
    case 'pot':
      return createPot(material);
    case 'vase':
      return createVase(material);
    case 'rounded_cube':
      return createRoundedCube(material);
    case 'low_poly_sphere':
      return createLowPolySphere(material);
    case 'star':
      return createStar(material);
    case 'heart':
      return createHeart(material);
    case 'rocket':
      return createRocket(material);
    default:
      return createRoundedCube(material);
  }
}

// Patito de Goma
function createDuck(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo
  const bodyGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  bodyGeometry.scale(1, 0.8, 1.2);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Cabeza
  const headGeometry = new THREE.SphereGeometry(0.35, 32, 32);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.set(0, 0.5, 0.3);
  head.castShadow = true;
  group.add(head);
  
  // Pico
  const beakGeometry = new THREE.ConeGeometry(0.1, 0.2, 16);
  const beakMaterial = new THREE.MeshPhongMaterial({ color: 0xff9900 });
  const beak = new THREE.Mesh(beakGeometry, beakMaterial);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.5, 0.6);
  beak.castShadow = true;
  group.add(beak);
  
  group.position.set(0, -0.2, 0);
  return group;
}

// Gatito
function createCat(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo
  const bodyGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.8);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Cabeza
  const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.set(0, 0.6, 0);
  head.castShadow = true;
  group.add(head);
  
  // Orejas
  const earGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
  const leftEar = new THREE.Mesh(earGeometry, material);
  leftEar.position.set(-0.2, 0.95, 0);
  leftEar.castShadow = true;
  group.add(leftEar);
  
  const rightEar = new THREE.Mesh(earGeometry, material);
  rightEar.position.set(0.2, 0.95, 0);
  rightEar.castShadow = true;
  group.add(rightEar);
  
  group.position.set(0, -0.2, 0);
  return group;
}

// Conejito
function createRabbit(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo
  const bodyGeometry = new THREE.SphereGeometry(0.4, 32, 32);
  bodyGeometry.scale(1, 1.2, 1);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Cabeza
  const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.set(0, 0.6, 0);
  head.castShadow = true;
  group.add(head);
  
  // Orejas largas
  const earGeometry = new THREE.CapsuleGeometry(0.08, 0.6, 4, 8);
  const leftEar = new THREE.Mesh(earGeometry, material);
  leftEar.position.set(-0.15, 1.1, 0);
  leftEar.castShadow = true;
  group.add(leftEar);
  
  const rightEar = new THREE.Mesh(earGeometry, material);
  rightEar.position.set(0.15, 1.1, 0);
  rightEar.castShadow = true;
  group.add(rightEar);
  
  group.position.set(0, -0.2, 0);
  return group;
}

// Osito
function createBear(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo
  const bodyGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  bodyGeometry.scale(1, 1.3, 1);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Cabeza
  const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.set(0, 0.7, 0);
  head.castShadow = true;
  group.add(head);
  
  // Orejas redondas
  const earGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const leftEar = new THREE.Mesh(earGeometry, material);
  leftEar.position.set(-0.3, 1, 0);
  leftEar.castShadow = true;
  group.add(leftEar);
  
  const rightEar = new THREE.Mesh(earGeometry, material);
  rightEar.position.set(0.3, 1, 0);
  rightEar.castShadow = true;
  group.add(rightEar);
  
  group.position.set(0, -0.3, 0);
  return group;
}

// Robot
function createRobot(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo
  const bodyGeometry = new THREE.BoxGeometry(0.7, 0.8, 0.5);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Cabeza
  const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.set(0, 0.65, 0);
  head.castShadow = true;
  group.add(head);
  
  // Antena
  const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
  const antenna = new THREE.Mesh(antennaGeometry, material);
  antenna.position.set(0, 1.05, 0);
  antenna.castShadow = true;
  group.add(antenna);
  
  const ballGeometry = new THREE.SphereGeometry(0.08, 16, 16);
  const ball = new THREE.Mesh(ballGeometry, material);
  ball.position.set(0, 1.25, 0);
  ball.castShadow = true;
  group.add(ball);
  
  group.position.set(0, -0.2, 0);
  return group;
}

// Astronauta
function createAstronaut(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo
  const bodyGeometry = new THREE.CapsuleGeometry(0.35, 0.7, 4, 8);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Casco (esfera)
  const helmetGeometry = new THREE.SphereGeometry(0.4, 32, 32);
  const helmet = new THREE.Mesh(helmetGeometry, material);
  helmet.position.set(0, 0.8, 0);
  helmet.castShadow = true;
  group.add(helmet);
  
  group.position.set(0, -0.3, 0);
  return group;
}

// Ninja
function createNinja(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo
  const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Cabeza
  const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.set(0, 0.8, 0);
  head.castShadow = true;
  group.add(head);
  
  group.position.set(0, -0.3, 0);
  return group;
}

// Taza
function createMug(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo de la taza (cilindro)
  const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.35, 0.8, 32);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Asa (torus)
  const handleGeometry = new THREE.TorusGeometry(0.25, 0.08, 16, 32, Math.PI);
  const handle = new THREE.Mesh(handleGeometry, material);
  handle.rotation.y = -Math.PI / 2;
  handle.position.set(0.5, 0, 0);
  handle.castShadow = true;
  group.add(handle);
  
  return group;
}

// Maceta
function createPot(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  const potGeometry = new THREE.CylinderGeometry(0.5, 0.35, 0.7, 32);
  const pot = new THREE.Mesh(potGeometry, material);
  pot.castShadow = true;
  group.add(pot);
  
  return group;
}

// Jarrón
function createVase(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  const vaseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1, 32);
  const vase = new THREE.Mesh(vaseGeometry, material);
  vase.castShadow = true;
  group.add(vase);
  
  return group;
}

// Cubo Redondeado
function createRoundedCube(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8, 8, 8, 8);
  const cube = new THREE.Mesh(cubeGeometry, material);
  cube.castShadow = true;
  group.add(cube);
  
  return group;
}

// Esfera de Baja Poli
function createLowPolySphere(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  const sphereGeometry = new THREE.SphereGeometry(0.5, 8, 6);
  const sphere = new THREE.Mesh(sphereGeometry, material);
  sphere.castShadow = true;
  group.add(sphere);
  
  return group;
}

// Estrella 3D
function createStar(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Crear estrella con múltiples pirámides
  const points = 5;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const coneGeometry = new THREE.ConeGeometry(0.2, 0.6, 4);
    const cone = new THREE.Mesh(coneGeometry, material);
    cone.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
    cone.rotation.z = -angle - Math.PI / 2;
    cone.castShadow = true;
    group.add(cone);
  }
  
  // Centro
  const centerGeometry = new THREE.SphereGeometry(0.25, 16, 16);
  const center = new THREE.Mesh(centerGeometry, material);
  center.castShadow = true;
  group.add(center);
  
  return group;
}

// Corazón
function createHeart(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Crear forma de corazón con esferas
  const leftSphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), material);
  leftSphere.position.set(-0.25, 0.3, 0);
  leftSphere.castShadow = true;
  group.add(leftSphere);
  
  const rightSphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), material);
  rightSphere.position.set(0.25, 0.3, 0);
  rightSphere.castShadow = true;
  group.add(rightSphere);
  
  const bottomCone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 32), material);
  bottomCone.position.set(0, -0.2, 0);
  bottomCone.castShadow = true;
  group.add(bottomCone);
  
  return group;
}

// Cohete
function createRocket(material: THREE.MeshPhongMaterial): THREE.Group {
  const group = new THREE.Group();
  
  // Cuerpo
  const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 32);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  
  // Punta (cono)
  const noseGeometry = new THREE.ConeGeometry(0.3, 0.5, 32);
  const nose = new THREE.Mesh(noseGeometry, material);
  nose.position.set(0, 0.75, 0);
  nose.castShadow = true;
  group.add(nose);
  
  // Aletas
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const finGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.3);
    const fin = new THREE.Mesh(finGeometry, material);
    fin.position.set(Math.cos(angle) * 0.3, -0.4, Math.sin(angle) * 0.3);
    fin.castShadow = true;
    group.add(fin);
  }
  
  return group;
}
