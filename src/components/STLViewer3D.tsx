import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Move } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface STLViewer3DProps {
  stlData: ArrayBuffer;
  color: string;
  className?: string;
}

export function STLViewer3D({ stlData, color, className = "" }: STLViewer3DProps) {
  const { t } = useTranslation('common');
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    mesh?: THREE.Mesh;
    animationId?: number;
    initialCameraPosition?: THREE.Vector3;
    initialMeshRotation?: THREE.Euler;
  }>({});

  // Zoom controls
  const handleZoom = useCallback((delta: number) => {
    if (!sceneRef.current.camera) return;
    
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
    setZoomLevel(newZoom);
    
    const baseDistance = 4;
    const newDistance = baseDistance / newZoom;
    
    const direction = sceneRef.current.camera.position.clone().normalize();
    sceneRef.current.camera.position.copy(direction.multiplyScalar(newDistance));
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

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Toggle auto-rotate
  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate(!autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stlData) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting - enhanced for better visualization
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-5, 3, -5);
    scene.add(directionalLight2);

    // Add subtle fill light from below
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(0, -3, 0);
    scene.add(fillLight);

    // Parse STL
    try {
      const geometry = parseSTL(stlData);
      geometry.computeVertexNormals();
      
      // CRITICAL: Center and scale BEFORE creating mesh
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox!;
      
      // Calculate center
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      
      // Calculate size
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      
      // Translate geometry to center
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Calculate appropriate scale (fit in view)
      const targetSize = 2;
      const scale = maxDim > 0 ? targetSize / maxDim : 1;
      geometry.scale(scale, scale, scale);
      
      const material = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color(color),
        shininess: 50,
        side: THREE.DoubleSide,
        flatShading: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      scene.add(mesh);
      
      // Position camera at appropriate distance
      const distance = 4;
      const initialCameraPosition = new THREE.Vector3(distance * 0.5, distance * 0.3, distance);
      camera.position.copy(initialCameraPosition);
      camera.lookAt(0, 0, 0);
      
      const initialMeshRotation = mesh.rotation.clone();
      
      sceneRef.current = {
        scene,
        camera,
        renderer,
        mesh,
        initialCameraPosition: initialCameraPosition.clone(),
        initialMeshRotation: initialMeshRotation.clone(),
      };

      // Mouse interaction - enhanced with pan support
      let isDragging = false;
      let isPanning = false;
      let previousMousePosition = { x: 0, y: 0 };

      const onMouseDown = (e: MouseEvent) => {
        // Right-click or Shift+click for panning
        if (e.button === 2 || e.shiftKey) {
          isPanning = true;
          e.preventDefault();
        } else {
          isDragging = true;
          setAutoRotate(false);
        }
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const onMouseMove = (e: MouseEvent) => {
        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y,
        };

        if (isPanning && sceneRef.current.mesh) {
          // Pan the model
          sceneRef.current.mesh.position.x += deltaMove.x * 0.005;
          sceneRef.current.mesh.position.y -= deltaMove.y * 0.005;
        } else if (isDragging && sceneRef.current.mesh) {
          // Rotate the model
          sceneRef.current.mesh.rotation.y += deltaMove.x * 0.01;
          sceneRef.current.mesh.rotation.x += deltaMove.y * 0.01;
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const onMouseUp = () => {
        isDragging = false;
        isPanning = false;
      };

      const onContextMenu = (e: Event) => {
        e.preventDefault();
      };

      // Wheel zoom support
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        
        const currentDistance = sceneRef.current.camera?.position.length() || 4;
        const newDistance = Math.max(1.5, Math.min(10, currentDistance - delta * 2));
        
        if (sceneRef.current.camera) {
          const direction = sceneRef.current.camera.position.clone().normalize();
          sceneRef.current.camera.position.copy(direction.multiplyScalar(newDistance));
          setZoomLevel(4 / newDistance);
        }
      };

      // Touch support - enhanced with pinch zoom
      let initialTouchDistance = 0;
      
      const getTouchDistance = (touches: TouchList) => {
        if (touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      };

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDragging = true;
          setAutoRotate(false);
          previousMousePosition = { 
            x: e.touches[0].clientX, 
            y: e.touches[0].clientY 
          };
        } else if (e.touches.length === 2) {
          initialTouchDistance = getTouchDistance(e.touches);
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && initialTouchDistance > 0) {
          // Pinch zoom
          const currentDistance = getTouchDistance(e.touches);
          const delta = (currentDistance - initialTouchDistance) * 0.01;
          
          if (sceneRef.current.camera) {
            const cameraDistance = sceneRef.current.camera.position.length();
            const newDistance = Math.max(1.5, Math.min(10, cameraDistance - delta));
            const direction = sceneRef.current.camera.position.clone().normalize();
            sceneRef.current.camera.position.copy(direction.multiplyScalar(newDistance));
            setZoomLevel(4 / newDistance);
          }
          
          initialTouchDistance = currentDistance;
        } else if (isDragging && sceneRef.current.mesh && e.touches.length === 1) {
          const deltaMove = {
            x: e.touches[0].clientX - previousMousePosition.x,
            y: e.touches[0].clientY - previousMousePosition.y,
          };

          sceneRef.current.mesh.rotation.y += deltaMove.x * 0.01;
          sceneRef.current.mesh.rotation.x += deltaMove.y * 0.01;

          previousMousePosition = { 
            x: e.touches[0].clientX, 
            y: e.touches[0].clientY 
          };
        }
      };

      const onTouchEnd = () => {
        isDragging = false;
        initialTouchDistance = 0;
      };

      renderer.domElement.addEventListener("mousedown", onMouseDown);
      renderer.domElement.addEventListener("mousemove", onMouseMove);
      renderer.domElement.addEventListener("mouseup", onMouseUp);
      renderer.domElement.addEventListener("mouseleave", onMouseUp);
      renderer.domElement.addEventListener("contextmenu", onContextMenu);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
      renderer.domElement.addEventListener("touchstart", onTouchStart);
      renderer.domElement.addEventListener("touchmove", onTouchMove);
      renderer.domElement.addEventListener("touchend", onTouchEnd);

      // Handle resize
      const handleResize = () => {
        if (!containerRef.current || !sceneRef.current.camera || !sceneRef.current.renderer) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        sceneRef.current.camera.aspect = width / height;
        sceneRef.current.camera.updateProjectionMatrix();
        sceneRef.current.renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // Animation loop with auto-rotate state
      const animationAutoRotate = autoRotate;
      
      const animate = () => {
        sceneRef.current.animationId = requestAnimationFrame(animate);
        
        // Auto-rotate slowly when enabled and not dragging
        if (animationAutoRotate && !isDragging && sceneRef.current.mesh) {
          sceneRef.current.mesh.rotation.y += 0.003;
        }
        
        renderer.render(scene, camera);
      };
      animate();

      // Cleanup function
      return () => {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener("mousedown", onMouseDown);
        renderer.domElement.removeEventListener("mousemove", onMouseMove);
        renderer.domElement.removeEventListener("mouseup", onMouseUp);
        renderer.domElement.removeEventListener("mouseleave", onMouseUp);
        renderer.domElement.removeEventListener("contextmenu", onContextMenu);
        renderer.domElement.removeEventListener("wheel", onWheel);
        renderer.domElement.removeEventListener("touchstart", onTouchStart);
        renderer.domElement.removeEventListener("touchmove", onTouchMove);
        renderer.domElement.removeEventListener("touchend", onTouchEnd);
        if (container?.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    } catch (error) {
      console.error("Error loading STL:", error);
    }
  }, [stlData, color]);

  // Update color when it changes
  useEffect(() => {
    if (sceneRef.current.mesh?.material instanceof THREE.MeshPhongMaterial) {
      sceneRef.current.mesh.material.color = new THREE.Color(color);
    }
  }, [color]);

  return (
    <div 
      ref={wrapperRef}
      className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}
    >
      {/* Control buttons */}
      <div className="flex justify-center gap-1 mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleZoom(0.2)}
              >
                <ZoomIn className="h-4 w-4" />
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
                className="h-8 w-8 p-0"
                onClick={() => handleZoom(-0.2)}
              >
                <ZoomOut className="h-4 w-4" />
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
                className="h-8 w-8 p-0"
                onClick={handleResetView}
              >
                <RotateCcw className="h-4 w-4" />
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
                variant={autoRotate ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleToggleAutoRotate}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{autoRotate ? t('viewer3d.stopRotation') : t('viewer3d.startRotation')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleToggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFullscreen ? t('viewer3d.exitFullscreen') : t('viewer3d.fullscreen')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 3D Canvas container */}
      <div 
        ref={containerRef} 
        className={`w-full rounded-lg border bg-muted/30 cursor-grab active:cursor-grabbing ${
          isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-80'
        }`}
        style={{ touchAction: 'none' }}
      />

      {/* Instructions */}
      <div className="text-xs text-center text-muted-foreground mt-2 space-y-0.5">
        <p className="font-medium">{t('viewer3d.interactivePreview')}</p>
        <p>{t('viewer3d.mouseInstructions')}</p>
        <p>{t('viewer3d.touchInstructions')}</p>
      </div>
    </div>
  );
}

// STL Parser
function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const view = new DataView(buffer);
  const isASCII = isASCIISTL(buffer);
  
  if (isASCII) {
    return parseASCIISTL(new TextDecoder().decode(buffer));
  } else {
    return parseBinarySTL(view);
  }
}

function isASCIISTL(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer);
  const text = new TextDecoder().decode(view.slice(0, 80));
  return text.toLowerCase().includes('solid');
}

function parseASCIISTL(text: string): THREE.BufferGeometry {
  const vertices: number[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('vertex')) {
      const coords = line.split(/\s+/).slice(1).map(parseFloat);
      vertices.push(...coords);
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

function parseBinarySTL(view: DataView): THREE.BufferGeometry {
  const triangles = view.getUint32(80, true);
  const vertices = new Float32Array(triangles * 9);
  
  let offset = 84;
  for (let i = 0; i < triangles; i++) {
    offset += 12; // Skip normal
    
    for (let j = 0; j < 3; j++) {
      const idx = i * 9 + j * 3;
      vertices[idx] = view.getFloat32(offset, true);
      vertices[idx + 1] = view.getFloat32(offset + 4, true);
      vertices[idx + 2] = view.getFloat32(offset + 8, true);
      offset += 12;
    }
    
    offset += 2; // Skip attribute byte count
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  return geometry;
}
