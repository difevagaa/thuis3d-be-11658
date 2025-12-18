import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Lightbulb,
  Move3D,
  Box,
  Layers
} from "lucide-react";
import type { LampTemplate } from "@/pages/Lithophany";
import * as THREE from "three";

interface LithophanyPreview3DProps {
  processedImage: string;
  lampTemplate: LampTemplate;
  dimensions: { width: number; height: number };
}

export const LithophanyPreview3D = ({
  processedImage,
  lampTemplate,
  dimensions
}: LithophanyPreview3DProps) => {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lampMeshRef = useRef<THREE.Mesh | null>(null);
  const baseMeshRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number | null>(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [showBase, setShowBase] = useState(true);
  const [showLight, setShowLight] = useState(true);
  const [lightIntensity, setLightIntensity] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 50, 200);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, lightIntensity);
    spotLight.position.set(0, 100, 100);
    spotLight.castShadow = true;
    scene.add(spotLight);

    // Back light (simulates light through lithophane)
    const backLight = new THREE.PointLight(0xffffee, 0.6);
    backLight.position.set(0, 0, -30);
    scene.add(backLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x333333);
    gridHelper.position.y = -50;
    scene.add(gridHelper);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Create/update lamp mesh
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Remove existing lamp mesh
    if (lampMeshRef.current) {
      scene.remove(lampMeshRef.current);
      lampMeshRef.current.geometry.dispose();
      (lampMeshRef.current.material as THREE.Material).dispose();
    }

    // Create texture from processed image
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(processedImage);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Scale dimensions (mm to scene units, scaled down)
    const scale = 0.5;
    const width = dimensions.width * scale;
    const height = dimensions.height * scale;
    const depth = 3; // Lithophane thickness

    let geometry: THREE.BufferGeometry;

    // Create geometry based on lamp shape
    switch (lampTemplate.shape_type) {
      case 'curved':
      case 'arc':
        // Curved surface
        const curveRadius = lampTemplate.curve_radius || 80;
        const segments = lampTemplate.segments || 32;
        geometry = new THREE.CylinderGeometry(
          curveRadius * scale,
          curveRadius * scale,
          height,
          segments,
          1,
          true,
          0,
          Math.PI * 0.6
        );
        break;

      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          width / 2,
          width / 2,
          height,
          32,
          1,
          true
        );
        break;

      case 'sphere':
        geometry = new THREE.SphereGeometry(
          width / 2,
          32,
          32,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.8
        );
        break;

      case 'heart':
        // Heart shape approximation using box with custom UV
        geometry = new THREE.BoxGeometry(width, height, depth);
        break;

      case 'hexagon':
        geometry = new THREE.CylinderGeometry(
          width / 2,
          width / 2,
          height,
          6,
          1,
          true
        );
        break;

      case 'triangle':
        geometry = new THREE.CylinderGeometry(
          width / 2,
          width / 2,
          height,
          3,
          1,
          true
        );
        break;

      case 'oval':
        // Oval approximation
        geometry = new THREE.BoxGeometry(width, height, depth);
        break;

      default:
        // Flat panel (default)
        geometry = new THREE.BoxGeometry(width, height, depth);
    }

    // Material with texture
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.1
    });

    const lamp = new THREE.Mesh(geometry, material);
    lamp.castShadow = true;
    lamp.receiveShadow = true;
    scene.add(lamp);
    lampMeshRef.current = lamp;

  }, [processedImage, lampTemplate, dimensions]);

  // Create/update base mesh
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Remove existing base
    if (baseMeshRef.current) {
      scene.remove(baseMeshRef.current);
      baseMeshRef.current.geometry.dispose();
      (baseMeshRef.current.material as THREE.Material).dispose();
      baseMeshRef.current = null;
    }

    if (!showBase) return;

    const scale = 0.5;
    const baseWidth = dimensions.width * scale * 1.2;
    const baseHeight = 15; // Base height
    const baseDepth = 25; // Base depth for light holder

    // Light holder hole dimensions (Bambu Labs light: 15-16mm diameter, 8mm height)
    const lightHoleDiameter = 16;
    const lightHoleDepth = 10;

    // Create base geometry
    const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      roughness: 0.7,
      metalness: 0.2
    });

    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -dimensions.height * scale / 2 - baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    
    scene.add(base);
    baseMeshRef.current = base;

    // Add light holder indicator (cylinder)
    if (showLight) {
      const lightGeometry = new THREE.CylinderGeometry(
        lightHoleDiameter * scale / 2,
        lightHoleDiameter * scale / 2,
        lightHoleDepth * scale,
        16
      );
      const lightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffdd00,
        emissive: 0xffaa00,
        emissiveIntensity: lightIntensity
      });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.y = -dimensions.height * scale / 2 - baseHeight / 2 + lightHoleDepth * scale / 2;
      light.rotation.x = Math.PI / 2;
      scene.add(light);
    }

  }, [showBase, showLight, dimensions, lightIntensity]);

  // Animation loop
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    let rotation = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (autoRotate && lampMeshRef.current) {
        rotation += 0.005;
        lampMeshRef.current.rotation.y = rotation;
        if (baseMeshRef.current) {
          baseMeshRef.current.rotation.y = rotation;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoRotate]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = isFullscreen ? window.innerHeight : 400;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z *= 0.8;
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z *= 1.2;
    }
  };

  const handleResetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 50, 200);
      cameraRef.current.lookAt(0, 0, 0);
    }
    if (lampMeshRef.current) {
      lampMeshRef.current.rotation.y = 0;
    }
    if (baseMeshRef.current) {
      baseMeshRef.current.rotation.y = 0;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Move3D className="h-5 w-5" />
            {language === 'es' ? 'Vista Previa 3D' : '3D Preview'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleResetView}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3D Canvas */}
        <div 
          ref={containerRef} 
          className="w-full rounded-lg overflow-hidden bg-[#1a1a2e]"
          style={{ height: isFullscreen ? '80vh' : '400px' }}
        />

        {/* Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="auto-rotate" className="text-sm flex items-center gap-1.5">
              <RotateCw className="h-3.5 w-3.5" />
              {language === 'es' ? 'Auto-rotar' : 'Auto-rotate'}
            </Label>
            <Switch
              id="auto-rotate"
              checked={autoRotate}
              onCheckedChange={setAutoRotate}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="show-base" className="text-sm flex items-center gap-1.5">
              <Box className="h-3.5 w-3.5" />
              {language === 'es' ? 'Mostrar base' : 'Show base'}
            </Label>
            <Switch
              id="show-base"
              checked={showBase}
              onCheckedChange={setShowBase}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="show-light" className="text-sm flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              {language === 'es' ? 'Mostrar luz' : 'Show light'}
            </Label>
            <Switch
              id="show-light"
              checked={showLight}
              onCheckedChange={setShowLight}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              {language === 'es' ? 'Intensidad' : 'Intensity'}
            </Label>
            <Slider
              value={[lightIntensity]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={([v]) => setLightIntensity(v)}
            />
          </div>
        </div>

        {/* Info badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <Layers className="h-3 w-3 mr-1" />
            {dimensions.width}×{dimensions.height}mm
          </Badge>
          <Badge variant="outline">
            {language === 'es' ? lampTemplate.name_es || lampTemplate.name : lampTemplate.name_en || lampTemplate.name}
          </Badge>
          {lampTemplate.base_type && (
            <Badge variant="outline">
              Base: {lampTemplate.base_type}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
