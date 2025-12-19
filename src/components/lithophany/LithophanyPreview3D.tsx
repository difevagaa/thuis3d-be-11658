import { useEffect, useRef, useState, useMemo } from "react";
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
  const lampGroupRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);
  const backLightRef = useRef<THREE.PointLight | null>(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [showBase, setShowBase] = useState(true);
  const [showLight, setShowLight] = useState(true);
  const [lightIntensity, setLightIntensity] = useState(0.8);

  // Scale factor: mm to scene units
  const scale = 0.5;

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Front light
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
    frontLight.position.set(50, 100, 100);
    frontLight.castShadow = true;
    scene.add(frontLight);

    // Back light (simulates light through lithophane)
    const backLight = new THREE.PointLight(0xffffee, lightIntensity * 2);
    backLight.position.set(0, 0, -30);
    scene.add(backLight);
    backLightRef.current = backLight;

    // Grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x333333);
    gridHelper.position.y = -80;
    scene.add(gridHelper);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update back light intensity
  useEffect(() => {
    if (backLightRef.current) {
      backLightRef.current.intensity = showLight ? lightIntensity * 2 : 0;
    }
  }, [lightIntensity, showLight]);

  // Create lamp geometry based on shape type
  const createLampGeometry = useMemo(() => {
    return (shapeType: string, width: number, height: number, depth: number = 3) => {
      const w = width * scale;
      const h = height * scale;
      const d = depth;

      switch (shapeType) {
        case 'moon':
        case 'sphere':
          // Partial sphere for moon shape
          return new THREE.SphereGeometry(
            w / 2,
            32, 32,
            0, Math.PI * 2,
            0, Math.PI * 0.6
          );

        case 'heart':
          // Heart shape using custom path
          const heartShape = new THREE.Shape();
          const x = 0, y = 0;
          const s = w / 20;
          heartShape.moveTo(x, y + s * 5);
          heartShape.bezierCurveTo(x, y + s * 5, x - s * 5, y, x - s * 10, y);
          heartShape.bezierCurveTo(x - s * 15, y, x - s * 15, y + s * 7.5, x - s * 15, y + s * 7.5);
          heartShape.bezierCurveTo(x - s * 15, y + s * 11, x - s * 12, y + s * 15.4, x, y + s * 19);
          heartShape.bezierCurveTo(x + s * 12, y + s * 15.4, x + s * 15, y + s * 11, x + s * 15, y + s * 7.5);
          heartShape.bezierCurveTo(x + s * 15, y + s * 7.5, x + s * 15, y, x + s * 10, y);
          heartShape.bezierCurveTo(x + s * 5, y, x, y + s * 5, x, y + s * 5);
          
          const extrudeSettings = { depth: d, bevelEnabled: false };
          return new THREE.ExtrudeGeometry(heartShape, extrudeSettings);

        case 'star':
          // Star shape
          const starShape = new THREE.Shape();
          const points = 5;
          const outerR = w / 2;
          const innerR = outerR * 0.4;
          
          for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) starShape.moveTo(px, py);
            else starShape.lineTo(px, py);
          }
          starShape.closePath();
          return new THREE.ExtrudeGeometry(starShape, { depth: d, bevelEnabled: false });

        case 'hexagon':
        case 'hexagonal':
          return new THREE.CylinderGeometry(w / 2, w / 2, h, 6, 1, true);

        case 'octagon':
        case 'octagonal':
          return new THREE.CylinderGeometry(w / 2, w / 2, h, 8, 1, true);

        case 'cylinder':
        case 'cylindrical':
        case 'cylinder_small':
        case 'cylinder_medium':
        case 'cylinder_large':
          return new THREE.CylinderGeometry(w / 2, w / 2, h, 32, 1, true);

        case 'half_cylinder':
          return new THREE.CylinderGeometry(w / 2, w / 2, h, 32, 1, true, 0, Math.PI);

        case 'curved':
        case 'curved_soft':
        case 'curved_deep':
        case 'arc':
        case 'arch':
          const curveRadius = (shapeType === 'curved_deep' || shapeType === 'arch') ? 60 : 100;
          return new THREE.CylinderGeometry(
            curveRadius * scale,
            curveRadius * scale,
            h,
            32, 1, true,
            0, Math.PI * 0.5
          );

        case 'cloud':
          // Cloud shape approximation with multiple circles
          const cloudShape = new THREE.Shape();
          cloudShape.absarc(0, 0, w * 0.25, 0, Math.PI * 2, false);
          cloudShape.absarc(w * 0.2, w * 0.1, w * 0.2, 0, Math.PI * 2, false);
          cloudShape.absarc(-w * 0.2, w * 0.05, w * 0.18, 0, Math.PI * 2, false);
          cloudShape.absarc(w * 0.35, -w * 0.05, w * 0.15, 0, Math.PI * 2, false);
          cloudShape.absarc(-w * 0.35, -w * 0.05, w * 0.15, 0, Math.PI * 2, false);
          return new THREE.ExtrudeGeometry(cloudShape, { depth: d, bevelEnabled: false });

        case 'wave':
          // Wavy panel
          const waveShape = new THREE.Shape();
          const waveAmplitude = h * 0.1;
          const waveFreq = 3;
          waveShape.moveTo(-w / 2, 0);
          for (let i = 0; i <= 50; i++) {
            const wx = -w / 2 + (w * i / 50);
            const wy = Math.sin((i / 50) * Math.PI * 2 * waveFreq) * waveAmplitude;
            waveShape.lineTo(wx, wy + h / 2);
          }
          for (let i = 50; i >= 0; i--) {
            const wx = -w / 2 + (w * i / 50);
            const wy = Math.sin((i / 50) * Math.PI * 2 * waveFreq) * waveAmplitude;
            waveShape.lineTo(wx, wy - h / 2);
          }
          waveShape.closePath();
          return new THREE.ExtrudeGeometry(waveShape, { depth: d, bevelEnabled: false });

        case 'diamond':
          const diamondShape = new THREE.Shape();
          diamondShape.moveTo(0, h / 2);
          diamondShape.lineTo(w / 2, 0);
          diamondShape.lineTo(0, -h / 2);
          diamondShape.lineTo(-w / 2, 0);
          diamondShape.closePath();
          return new THREE.ExtrudeGeometry(diamondShape, { depth: d, bevelEnabled: false });

        case 'oval':
        case 'flat_oval':
          const ovalShape = new THREE.Shape();
          ovalShape.absellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2, false, 0);
          return new THREE.ExtrudeGeometry(ovalShape, { depth: d, bevelEnabled: false });

        case 'gothic':
          // Gothic arch shape
          const gothicShape = new THREE.Shape();
          gothicShape.moveTo(-w / 2, -h / 2);
          gothicShape.lineTo(-w / 2, h * 0.2);
          gothicShape.quadraticCurveTo(-w / 2, h / 2, 0, h / 2);
          gothicShape.quadraticCurveTo(w / 2, h / 2, w / 2, h * 0.2);
          gothicShape.lineTo(w / 2, -h / 2);
          gothicShape.closePath();
          return new THREE.ExtrudeGeometry(gothicShape, { depth: d, bevelEnabled: false });

        case 'ornamental':
        case 'framed_square':
          // Ornamental frame (slightly rounded rectangle)
          const ornShape = new THREE.Shape();
          const radius = Math.min(w, h) * 0.1;
          ornShape.moveTo(-w / 2 + radius, -h / 2);
          ornShape.lineTo(w / 2 - radius, -h / 2);
          ornShape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + radius);
          ornShape.lineTo(w / 2, h / 2 - radius);
          ornShape.quadraticCurveTo(w / 2, h / 2, w / 2 - radius, h / 2);
          ornShape.lineTo(-w / 2 + radius, h / 2);
          ornShape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - radius);
          ornShape.lineTo(-w / 2, -h / 2 + radius);
          ornShape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + radius, -h / 2);
          return new THREE.ExtrudeGeometry(ornShape, { depth: d, bevelEnabled: false });

        case 'circular':
          return new THREE.CylinderGeometry(w / 2, w / 2, d, 32, 1, false);

        case 'panoramic':
        case 'portrait':
        case 'flat_rectangle':
        case 'flat_square':
        case 'minimalist':
        default:
          // Flat panel (default)
          return new THREE.BoxGeometry(w, h, d);
      }
    };
  }, [scale]);

  // Create/update lamp mesh
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Remove existing lamp group
    if (lampGroupRef.current) {
      scene.remove(lampGroupRef.current);
      lampGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    // Create new group
    const lampGroup = new THREE.Group();
    lampGroupRef.current = lampGroup;

    // Create texture from processed image
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(processedImage);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;

    // Create lamp geometry
    const geometry = createLampGeometry(lampTemplate.shape_type, dimensions.width, dimensions.height, 3);

    // Material with lithophane-like properties
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0,
      transmission: 0.3, // Light passes through
      thickness: 2,
      clearcoat: 0.1,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: showLight ? lightIntensity * 0.1 : 0,
      emissiveMap: texture
    });

    const lamp = new THREE.Mesh(geometry, material);
    lamp.castShadow = true;
    lamp.receiveShadow = true;

    // Adjust position based on geometry type
    if (['moon', 'sphere'].includes(lampTemplate.shape_type)) {
      lamp.rotation.x = Math.PI / 2;
    } else if (['heart', 'star', 'diamond', 'cloud', 'wave', 'gothic', 'ornamental', 'oval', 'flat_oval', 'framed_square'].includes(lampTemplate.shape_type)) {
      lamp.rotation.x = 0;
    }

    lampGroup.add(lamp);

    // Create base if enabled
    if (showBase) {
      const baseWidth = dimensions.width * scale * 1.2;
      const baseDepth = 25;
      const baseHeight = 15;
      const ledHoleDiameter = 16;
      const ledHoleDepth = 10;

      // Main base
      const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        roughness: 0.8,
        metalness: 0.2
      });

      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = -dimensions.height * scale / 2 - baseHeight / 2 - 5;
      base.castShadow = true;
      base.receiveShadow = true;
      lampGroup.add(base);

      // Slot for lithophane panel
      const slotGeometry = new THREE.BoxGeometry(baseWidth * 0.8, 4, 5);
      const slotMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2a,
        roughness: 0.9
      });
      const slot = new THREE.Mesh(slotGeometry, slotMaterial);
      slot.position.y = base.position.y + baseHeight / 2 - 1;
      slot.position.z = -baseDepth / 4;
      lampGroup.add(slot);

      // LED hole indicator
      if (showLight) {
        const ledGeometry = new THREE.CylinderGeometry(
          ledHoleDiameter * scale / 2,
          ledHoleDiameter * scale / 2,
          ledHoleDepth * scale,
          16
        );
        const ledMaterial = new THREE.MeshStandardMaterial({
          color: 0xffdd00,
          emissive: 0xffaa00,
          emissiveIntensity: lightIntensity
        });
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.y = base.position.y;
        led.position.z = baseDepth / 4;
        led.rotation.x = Math.PI / 2;
        lampGroup.add(led);
      }
    }

    scene.add(lampGroup);

  }, [processedImage, lampTemplate, dimensions, showBase, showLight, lightIntensity, createLampGeometry]);

  // Animation loop
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    let rotation = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (autoRotate && lampGroupRef.current) {
        rotation += 0.005;
        lampGroupRef.current.rotation.y = rotation;
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
      const height = 400;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.max(50, cameraRef.current.position.z * 0.8);
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.min(500, cameraRef.current.position.z * 1.2);
    }
  };

  const handleResetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 50, 200);
      cameraRef.current.lookAt(0, 0, 0);
    }
    if (lampGroupRef.current) {
      lampGroupRef.current.rotation.y = 0;
    }
  };

  const getShapeDisplayName = () => {
    const names: Record<string, { en: string; es: string }> = {
      moon: { en: 'Moon', es: 'Luna' },
      heart: { en: 'Heart', es: 'Corazón' },
      star: { en: 'Star', es: 'Estrella' },
      hexagonal: { en: 'Hexagon', es: 'Hexágono' },
      octagonal: { en: 'Octagon', es: 'Octágono' },
      cylinder: { en: 'Cylinder', es: 'Cilindro' },
      curved: { en: 'Curved', es: 'Curvo' },
      flat_square: { en: 'Flat Square', es: 'Cuadrado Plano' },
      flat_rectangle: { en: 'Flat Rectangle', es: 'Rectángulo Plano' },
      cloud: { en: 'Cloud', es: 'Nube' },
      wave: { en: 'Wave', es: 'Ola' },
      diamond: { en: 'Diamond', es: 'Diamante' },
      gothic: { en: 'Gothic Arch', es: 'Arco Gótico' },
      ornamental: { en: 'Ornamental', es: 'Ornamental' }
    };
    const shapeName = names[lampTemplate.shape_type];
    return shapeName ? (language === 'es' ? shapeName.es : shapeName.en) : lampTemplate.shape_type;
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
            <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleResetView} title="Reset View">
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
          style={{ height: '400px' }}
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
          <Badge variant="secondary">
            {getShapeDisplayName()}
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