import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
  Layers,
  RotateCcw,
  Hand,
  MousePointer2
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
  const [lightColor, setLightColor] = useState('#ffffee');
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'rotate' | 'pan'>('rotate');
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Scale factor: mm to scene units
  const scale = 0.5;

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 300, 600);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 50, 200);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer with improved settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient light - softer
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Front fill light
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.4);
    frontLight.position.set(50, 100, 100);
    frontLight.castShadow = true;
    frontLight.shadow.mapSize.width = 1024;
    frontLight.shadow.mapSize.height = 1024;
    scene.add(frontLight);

    // Rim light for drama
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    rimLight.position.set(-50, 50, -100);
    scene.add(rimLight);

    // Back light (simulates light through lithophane)
    const backLight = new THREE.PointLight(0xffffee, lightIntensity * 3);
    backLight.position.set(0, 0, -40);
    backLight.castShadow = true;
    scene.add(backLight);
    backLightRef.current = backLight;

    // Ground plane for shadows
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -100;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper - more subtle
    const gridHelper = new THREE.GridHelper(200, 20, 0x333344, 0x222233);
    gridHelper.position.y = -85;
    scene.add(gridHelper);

    // Mouse/touch controls
    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setAutoRotate(false);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !lampGroupRef.current || !cameraRef.current) return;
      
      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;
      
      if (dragMode === 'rotate') {
        lampGroupRef.current.rotation.y += deltaX * 0.01;
        lampGroupRef.current.rotation.x += deltaY * 0.01;
        // Clamp X rotation
        lampGroupRef.current.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, lampGroupRef.current.rotation.x));
      } else {
        cameraRef.current.position.x -= deltaX * 0.5;
        cameraRef.current.position.y += deltaY * 0.5;
      }
      
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.z += e.deltaY * 0.5;
        cameraRef.current.position.z = Math.max(80, Math.min(400, cameraRef.current.position.z));
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mouseleave', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mouseleave', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update back light
  useEffect(() => {
    if (backLightRef.current) {
      backLightRef.current.intensity = showLight ? lightIntensity * 3 : 0;
      backLightRef.current.color.set(lightColor);
    }
  }, [lightIntensity, showLight, lightColor]);

  // Create lamp geometry based on shape type - Enhanced with more shapes
  const createLampGeometry = useMemo(() => {
    return (shapeType: string, width: number, height: number, depth: number = 3) => {
      const w = width * scale;
      const h = height * scale;
      const d = depth;

      switch (shapeType) {
        case 'moon':
        case 'sphere':
          // Partial sphere for moon shape - improved
          const moonGeo = new THREE.SphereGeometry(
            Math.min(w, h) / 2,
            48, 48,
            0, Math.PI * 2,
            0, Math.PI * 0.55
          );
          return moonGeo;

        case 'heart':
          // Heart shape using custom path - improved curves
          const heartShape = new THREE.Shape();
          const x = 0, y = 0;
          const s = w / 22;
          heartShape.moveTo(x, y + s * 5);
          heartShape.bezierCurveTo(x, y + s * 5, x - s * 5, y, x - s * 10, y);
          heartShape.bezierCurveTo(x - s * 17, y, x - s * 17, y + s * 9, x - s * 17, y + s * 9);
          heartShape.bezierCurveTo(x - s * 17, y + s * 13, x - s * 12, y + s * 17, x, y + s * 22);
          heartShape.bezierCurveTo(x + s * 12, y + s * 17, x + s * 17, y + s * 13, x + s * 17, y + s * 9);
          heartShape.bezierCurveTo(x + s * 17, y + s * 9, x + s * 17, y, x + s * 10, y);
          heartShape.bezierCurveTo(x + s * 5, y, x, y + s * 5, x, y + s * 5);
          
          return new THREE.ExtrudeGeometry(heartShape, { 
            depth: d, 
            bevelEnabled: true,
            bevelThickness: 0.5,
            bevelSize: 0.3,
            bevelSegments: 3
          });

        case 'star':
          // Star shape - smoother
          const starShape = new THREE.Shape();
          const points = 5;
          const outerR = w / 2;
          const innerR = outerR * 0.38;
          
          for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) starShape.moveTo(px, py);
            else starShape.lineTo(px, py);
          }
          starShape.closePath();
          return new THREE.ExtrudeGeometry(starShape, { 
            depth: d, 
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.2,
            bevelSegments: 2
          });

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
          return new THREE.CylinderGeometry(w / 2, w / 2, h, 48, 1, true);

        case 'half_cylinder':
          return new THREE.CylinderGeometry(w / 2, w / 2, h, 48, 1, true, 0, Math.PI);

        case 'curved':
        case 'curved_soft':
        case 'curved_deep':
        case 'arc':
        case 'arch':
          const curveRadius = (shapeType === 'curved_deep' || shapeType === 'arch') ? 50 : 80;
          return new THREE.CylinderGeometry(
            curveRadius * scale,
            curveRadius * scale,
            h,
            48, 1, true,
            0, Math.PI * 0.6
          );

        case 'cloud':
          // Cloud shape with bezier curves
          const cloudShape = new THREE.Shape();
          cloudShape.moveTo(-w * 0.4, 0);
          cloudShape.bezierCurveTo(-w * 0.5, h * 0.3, -w * 0.3, h * 0.5, 0, h * 0.4);
          cloudShape.bezierCurveTo(w * 0.2, h * 0.6, w * 0.4, h * 0.4, w * 0.4, h * 0.2);
          cloudShape.bezierCurveTo(w * 0.5, 0, w * 0.3, -h * 0.2, 0, -h * 0.1);
          cloudShape.bezierCurveTo(-w * 0.2, -h * 0.3, -w * 0.5, -h * 0.1, -w * 0.4, 0);
          return new THREE.ExtrudeGeometry(cloudShape, { 
            depth: d, 
            bevelEnabled: true,
            bevelThickness: 0.5,
            bevelSize: 0.3,
            bevelSegments: 3
          });

        case 'wave':
          // Wavy panel - smoother wave
          const waveShape = new THREE.Shape();
          const waveAmplitude = h * 0.12;
          const waveFreq = 2.5;
          waveShape.moveTo(-w / 2, 0);
          for (let i = 0; i <= 60; i++) {
            const wx = -w / 2 + (w * i / 60);
            const wy = Math.sin((i / 60) * Math.PI * 2 * waveFreq) * waveAmplitude;
            waveShape.lineTo(wx, wy + h / 2);
          }
          for (let i = 60; i >= 0; i--) {
            const wx = -w / 2 + (w * i / 60);
            const wy = Math.sin((i / 60) * Math.PI * 2 * waveFreq) * waveAmplitude;
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
          return new THREE.ExtrudeGeometry(diamondShape, { 
            depth: d, 
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.2,
            bevelSegments: 2
          });

        case 'oval':
        case 'flat_oval':
          const ovalShape = new THREE.Shape();
          ovalShape.absellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2, false, 0);
          return new THREE.ExtrudeGeometry(ovalShape, { 
            depth: d, 
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.2,
            bevelSegments: 2
          });

        case 'gothic':
          // Gothic arch shape - improved
          const gothicShape = new THREE.Shape();
          gothicShape.moveTo(-w / 2, -h / 2);
          gothicShape.lineTo(-w / 2, h * 0.15);
          gothicShape.bezierCurveTo(-w / 2, h * 0.4, -w * 0.3, h / 2, 0, h / 2);
          gothicShape.bezierCurveTo(w * 0.3, h / 2, w / 2, h * 0.4, w / 2, h * 0.15);
          gothicShape.lineTo(w / 2, -h / 2);
          gothicShape.closePath();
          return new THREE.ExtrudeGeometry(gothicShape, { 
            depth: d, 
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.2,
            bevelSegments: 2
          });

        case 'ornamental':
        case 'framed_square':
          // Ornamental frame with decorative corners
          const ornShape = new THREE.Shape();
          const radius = Math.min(w, h) * 0.12;
          ornShape.moveTo(-w / 2 + radius, -h / 2);
          ornShape.lineTo(w / 2 - radius, -h / 2);
          ornShape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + radius);
          ornShape.lineTo(w / 2, h / 2 - radius);
          ornShape.quadraticCurveTo(w / 2, h / 2, w / 2 - radius, h / 2);
          ornShape.lineTo(-w / 2 + radius, h / 2);
          ornShape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - radius);
          ornShape.lineTo(-w / 2, -h / 2 + radius);
          ornShape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + radius, -h / 2);
          return new THREE.ExtrudeGeometry(ornShape, { 
            depth: d, 
            bevelEnabled: true,
            bevelThickness: 0.4,
            bevelSize: 0.3,
            bevelSegments: 3
          });

        case 'circular':
          const circleShape = new THREE.Shape();
          circleShape.absarc(0, 0, w / 2, 0, Math.PI * 2, false);
          return new THREE.ExtrudeGeometry(circleShape, { 
            depth: d, 
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.2,
            bevelSegments: 2
          });

        case 'panoramic':
        case 'portrait':
        case 'flat_rectangle':
        case 'flat_square':
        case 'minimalist':
        default:
          // Flat panel with slight bevel for realism
          const rectShape = new THREE.Shape();
          const bevel = 1;
          rectShape.moveTo(-w / 2 + bevel, -h / 2);
          rectShape.lineTo(w / 2 - bevel, -h / 2);
          rectShape.lineTo(w / 2, -h / 2 + bevel);
          rectShape.lineTo(w / 2, h / 2 - bevel);
          rectShape.lineTo(w / 2 - bevel, h / 2);
          rectShape.lineTo(-w / 2 + bevel, h / 2);
          rectShape.lineTo(-w / 2, h / 2 - bevel);
          rectShape.lineTo(-w / 2, -h / 2 + bevel);
          rectShape.closePath();
          return new THREE.ExtrudeGeometry(rectShape, { 
            depth: d, 
            bevelEnabled: false
          });
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
    texture.magFilter = THREE.LinearFilter;

    // Create lamp geometry
    const geometry = createLampGeometry(lampTemplate.shape_type, dimensions.width, dimensions.height, 3);

    // Material with realistic lithophane-like properties
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0,
      transmission: showLight ? 0.4 : 0.1,
      thickness: 2.5,
      clearcoat: 0.15,
      clearcoatRoughness: 0.3,
      ior: 1.45,
      emissive: new THREE.Color(lightColor),
      emissiveIntensity: showLight ? lightIntensity * 0.15 : 0,
      emissiveMap: texture,
      envMapIntensity: 0.5
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
      const baseWidth = dimensions.width * scale * 1.25;
      const baseDepth = 28;
      const baseHeight = 18;
      const ledHoleDiameter = 16;

      // Main base with rounded edges
      const baseShape = new THREE.Shape();
      const br = 3; // corner radius
      baseShape.moveTo(-baseWidth / 2 + br, -baseDepth / 2);
      baseShape.lineTo(baseWidth / 2 - br, -baseDepth / 2);
      baseShape.quadraticCurveTo(baseWidth / 2, -baseDepth / 2, baseWidth / 2, -baseDepth / 2 + br);
      baseShape.lineTo(baseWidth / 2, baseDepth / 2 - br);
      baseShape.quadraticCurveTo(baseWidth / 2, baseDepth / 2, baseWidth / 2 - br, baseDepth / 2);
      baseShape.lineTo(-baseWidth / 2 + br, baseDepth / 2);
      baseShape.quadraticCurveTo(-baseWidth / 2, baseDepth / 2, -baseWidth / 2, baseDepth / 2 - br);
      baseShape.lineTo(-baseWidth / 2, -baseDepth / 2 + br);
      baseShape.quadraticCurveTo(-baseWidth / 2, -baseDepth / 2, -baseWidth / 2 + br, -baseDepth / 2);

      const baseGeometry = new THREE.ExtrudeGeometry(baseShape, {
        depth: baseHeight,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 1,
        bevelSegments: 3
      });
      
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        roughness: 0.7,
        metalness: 0.3
      });

      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.rotation.x = -Math.PI / 2;
      base.position.y = -dimensions.height * scale / 2 - baseHeight / 2 - 5;
      base.castShadow = true;
      base.receiveShadow = true;
      lampGroup.add(base);

      // Slot for lithophane panel
      const slotGeometry = new THREE.BoxGeometry(baseWidth * 0.85, 5, 6);
      const slotMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2a,
        roughness: 0.9
      });
      const slot = new THREE.Mesh(slotGeometry, slotMaterial);
      slot.position.y = base.position.y + baseHeight / 2 + 2;
      slot.position.z = -baseDepth / 4;
      lampGroup.add(slot);

      // LED glow indicator
      if (showLight) {
        // LED mesh
        const ledGeometry = new THREE.CylinderGeometry(
          ledHoleDiameter * scale / 2 * 0.8,
          ledHoleDiameter * scale / 2,
          8,
          24
        );
        const ledMaterial = new THREE.MeshStandardMaterial({
          color: lightColor,
          emissive: lightColor,
          emissiveIntensity: lightIntensity * 1.5,
          transparent: true,
          opacity: 0.9
        });
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.y = base.position.y + 2;
        led.position.z = 0;
        lampGroup.add(led);

        // LED glow sprite
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 64;
        glowCanvas.height = 64;
        const glowCtx = glowCanvas.getContext('2d');
        if (glowCtx) {
          const gradient = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
          gradient.addColorStop(0, 'rgba(255, 255, 238, 0.8)');
          gradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.4)');
          gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
          glowCtx.fillStyle = gradient;
          glowCtx.fillRect(0, 0, 64, 64);
        }
        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const glowMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          opacity: lightIntensity * 0.6
        });
        const glow = new THREE.Sprite(glowMaterial);
        glow.position.copy(led.position);
        glow.position.z -= 5;
        glow.scale.set(40, 40, 1);
        lampGroup.add(glow);
      }
    }

    scene.add(lampGroup);

  }, [processedImage, lampTemplate, dimensions, showBase, showLight, lightIntensity, lightColor, createLampGeometry]);

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
        rotation += 0.003;
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
      const height = 450;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.max(60, cameraRef.current.position.z * 0.8);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.min(400, cameraRef.current.position.z * 1.2);
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 50, 200);
      cameraRef.current.lookAt(0, 0, 0);
    }
    if (lampGroupRef.current) {
      lampGroupRef.current.rotation.set(0, 0, 0);
    }
    setAutoRotate(true);
  }, []);

  const getShapeDisplayName = useCallback(() => {
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
      ornamental: { en: 'Ornamental', es: 'Ornamental' },
      circular: { en: 'Circular', es: 'Circular' },
      oval: { en: 'Oval', es: 'Ovalado' }
    };
    const shapeName = names[lampTemplate.shape_type];
    return shapeName ? (language === 'es' ? shapeName.es : shapeName.en) : lampTemplate.shape_type;
  }, [lampTemplate.shape_type, language]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Move3D className="h-5 w-5" />
            {language === 'es' ? 'Vista Previa 3D' : '3D Preview'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant={dragMode === 'rotate' ? 'secondary' : 'outline'} 
              size="icon" 
              onClick={() => setDragMode('rotate')} 
              title={language === 'es' ? 'Rotar' : 'Rotate'}
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>
            <Button 
              variant={dragMode === 'pan' ? 'secondary' : 'outline'} 
              size="icon" 
              onClick={() => setDragMode('pan')} 
              title={language === 'es' ? 'Mover' : 'Pan'}
            >
              <Hand className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleResetView} title="Reset View">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3D Canvas */}
        <div 
          ref={containerRef} 
          className="w-full rounded-lg overflow-hidden bg-[#1a1a2e] cursor-grab active:cursor-grabbing"
          style={{ height: '450px' }}
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

        {/* Interaction hint */}
        <p className="text-xs text-muted-foreground text-center">
          {language === 'es' 
            ? '🖱️ Arrastra para rotar • Rueda para zoom • Usa los botones para cambiar modo'
            : '🖱️ Drag to rotate • Scroll to zoom • Use buttons to change mode'}
        </p>

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
          <Badge variant="outline" className="bg-green-500/10 text-green-600">
            LED 16mm ✓
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
