import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { logger } from "@/lib/logger";
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
  Lightbulb,
  Move3D,
  Box,
  Layers,
  RotateCcw,
  Hand,
  MousePointer2,
  Download
} from "lucide-react";
import type { LampTemplate } from "@/pages/Lithophany";
import * as THREE from "three";
import { generateLithophaneSTL, downloadSTL } from "@/lib/lithophaneSTLGenerator";

interface LithophanyPreview3DProps {
  processedImage: string;
  lampTemplate: LampTemplate;
  dimensions: { width: number; height: number };
  customText?: string;
}

export const LithophanyPreview3D = ({
  processedImage,
  lampTemplate,
  dimensions,
  customText
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

  // Lithophane thickness parameters (in mm)
  const minThickness = 0.6;
  const maxThickness = 3.2;

  /**
   * Build actual lithophane geometry: a depth-displaced mesh where
   * bright pixels → thin (more light passes) and dark pixels → thick.
   * This matches how a real 3D-printed lithophane works.
   */
  const buildLithophaneGeometry = useCallback(
    (
      imageData: ImageData,
      shapeType: string,
      width: number,
      height: number
    ): THREE.BufferGeometry => {
      const w = width * scale;
      const h = height * scale;
      const minT = minThickness * scale;
      const maxT = maxThickness * scale;

      // Grid resolution: balance quality vs performance
      const gridX = Math.min(imageData.width, 120);
      const gridY = Math.min(imageData.height, 120);

      const stepX = w / gridX;
      const stepY = h / gridY;

      // Sample image to produce a depth map (luminance → thickness)
      const depths: number[][] = [];
      for (let gy = 0; gy <= gridY; gy++) {
        const row: number[] = [];
        for (let gx = 0; gx <= gridX; gx++) {
          const imgX = Math.min(Math.floor((gx / gridX) * imageData.width), imageData.width - 1);
          const imgY = Math.min(Math.floor((gy / gridY) * imageData.height), imageData.height - 1);
          const idx = (imgY * imageData.width + imgX) * 4;
          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          // Bright → thin, dark → thick
          const depth = minT + (1 - luminance) * (maxT - minT);
          row.push(depth);
        }
        depths.push(row);
      }

      // Apply shape transformation function (consistent with STL generator)
      const applyShape = (px: number, py: number, pz: number): [number, number, number] => {
        switch (shapeType) {
          case 'cylinder_small':
          case 'cylinder_medium':
          case 'cylinder_large': {
            const angle = (px / w) * Math.PI * 2;
            const radius = w / (Math.PI * 2);
            return [
              Math.cos(angle) * (radius + pz),
              py,
              Math.sin(angle) * (radius + pz)
            ];
          }
          case 'half_cylinder': {
            const angle = (px / w) * Math.PI;
            const radius = w / Math.PI;
            return [
              Math.cos(angle) * (radius + pz),
              py,
              Math.sin(angle) * (radius + pz)
            ];
          }
          case 'hexagonal': {
            const segments = 6;
            const angle = (px / w) * Math.PI * 2;
            const segAngle = Math.PI * 2 / segments;
            const seg = Math.floor(angle / segAngle);
            const radius = w / (Math.PI * 2);
            const localAngle = seg * segAngle + (angle % segAngle);
            return [
              Math.cos(localAngle) * (radius + pz),
              py,
              Math.sin(localAngle) * (radius + pz)
            ];
          }
          case 'octagonal': {
            const segments = 8;
            const angle = (px / w) * Math.PI * 2;
            const segAngle = Math.PI * 2 / segments;
            const seg = Math.floor(angle / segAngle);
            const radius = w / (Math.PI * 2);
            const localAngle = seg * segAngle + (angle % segAngle);
            return [
              Math.cos(localAngle) * (radius + pz),
              py,
              Math.sin(localAngle) * (radius + pz)
            ];
          }
          case 'curved_soft': {
            const curveZ = Math.sin((px / w) * Math.PI) * w * 0.15;
            return [px - w / 2, py - h / 2, pz + curveZ];
          }
          case 'curved_deep':
          case 'arch': {
            const curveZ = Math.sin((px / w) * Math.PI) * w * 0.3;
            return [px - w / 2, py - h / 2, pz + curveZ];
          }
          case 'moon': {
            const cx = w / 2, cy = h / 2;
            const dx = px - cx, dy = py - cy;
            const rad = Math.min(w, h) / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const sphereZ = dist < rad ? Math.sqrt(Math.max(0, rad * rad - dist * dist)) * 0.35 : 0;
            return [px - w / 2, py - h / 2, pz + sphereZ];
          }
          case 'wave': {
            const waveZ = Math.sin((px / w) * Math.PI * 3) * w * 0.08;
            return [px - w / 2, py - h / 2, pz + waveZ];
          }
          case 'heart': {
            const nx = (px - w / 2) / (w / 2);
            const ny = (py - h / 2) / (h / 2);
            const bulge = 0.1 * w * Math.max(0, 1 - nx * nx - ny * ny);
            return [px - w / 2, py - h / 2, pz + bulge];
          }
          case 'star': {
            const dx = px - w / 2, dy = py - h / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = Math.sqrt((w / 2) * (w / 2) + (h / 2) * (h / 2));
            const bulge = 0.05 * w * Math.max(0, 1 - dist / maxDist);
            return [px - w / 2, py - h / 2, pz + bulge];
          }
          case 'diamond': {
            const dx = Math.abs(px - w / 2) / (w / 2);
            const dy = Math.abs(py - h / 2) / (h / 2);
            const peak = 0.1 * w * Math.max(0, 1 - Math.max(dx, dy));
            return [px - w / 2, py - h / 2, pz + peak];
          }
          case 'cloud': {
            const bump1 = Math.sin((px / w) * Math.PI * 2) * Math.sin((py / h) * Math.PI);
            const bump2 = Math.sin((px / w) * Math.PI * 3) * Math.cos((py / h) * Math.PI * 1.5);
            const cloudZ = (bump1 + bump2 * 0.5) * w * 0.06;
            return [px - w / 2, py - h / 2, pz + cloudZ];
          }
          case 'gothic': {
            const ny = py / h;
            if (ny > 0.5) {
              const prog = (ny - 0.5) * 2;
              const nx = Math.abs(px - w / 2) / (w / 2);
              const archZ = prog * (1 - nx) * w * 0.15;
              return [px - w / 2, py - h / 2, pz + archZ];
            }
            return [px - w / 2, py - h / 2, pz];
          }
          case 'ornamental':
          case 'framed_square': {
            const edgeDist = Math.min(px, w - px, py, h - py);
            const maxEdge = Math.min(w, h) * 0.1;
            const frameZ = edgeDist < maxEdge ? (maxEdge - edgeDist) * 0.05 : 0;
            return [px - w / 2, py - h / 2, pz + frameZ];
          }
          case 'circular': {
            const dx = px - w / 2, dy = py - h / 2;
            const rad = Math.min(w, h) / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const domeZ = dist < rad ? Math.sqrt(Math.max(0, rad * rad - dist * dist)) * 0.1 : 0;
            return [px - w / 2, py - h / 2, pz + domeZ];
          }
          default:
            return [px - w / 2, py - h / 2, pz];
        }
      };

      // Build vertex arrays for front face (depth-displaced) and back face (flat)
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];

      const addQuad = (
        p1: [number, number, number],
        p2: [number, number, number],
        p3: [number, number, number],
        p4: [number, number, number],
        u1: [number, number],
        u2: [number, number],
        u3: [number, number],
        u4: [number, number]
      ) => {
        // Triangle 1: p1, p2, p3
        const e1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
        const e2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
        const n1 = [
          e1[1] * e2[2] - e1[2] * e2[1],
          e1[2] * e2[0] - e1[0] * e2[2],
          e1[0] * e2[1] - e1[1] * e2[0]
        ];
        const len1 = Math.sqrt(n1[0] * n1[0] + n1[1] * n1[1] + n1[2] * n1[2]) || 1;
        n1[0] /= len1; n1[1] /= len1; n1[2] /= len1;

        positions.push(...p1, ...p2, ...p3);
        normals.push(...n1, ...n1, ...n1);
        uvs.push(...u1, ...u2, ...u3);

        // Triangle 2: p1, p3, p4
        const e3 = [p4[0] - p1[0], p4[1] - p1[1], p4[2] - p1[2]];
        const n2 = [
          e2[1] * e3[2] - e2[2] * e3[1],
          e2[2] * e3[0] - e2[0] * e3[2],
          e2[0] * e3[1] - e2[1] * e3[0]
        ];
        const len2 = Math.sqrt(n2[0] * n2[0] + n2[1] * n2[1] + n2[2] * n2[2]) || 1;
        n2[0] /= len2; n2[1] /= len2; n2[2] /= len2;

        positions.push(...p1, ...p3, ...p4);
        normals.push(...n2, ...n2, ...n2);
        uvs.push(...u1, ...u3, ...u4);
      };

      // Front face (depth-displaced)
      for (let gy = 0; gy < gridY; gy++) {
        for (let gx = 0; gx < gridX; gx++) {
          const x0 = gx * stepX, x1 = (gx + 1) * stepX;
          const y0 = gy * stepY, y1 = (gy + 1) * stepY;

          const z00 = depths[gy][gx];
          const z10 = depths[gy][gx + 1];
          const z01 = depths[gy + 1][gx];
          const z11 = depths[gy + 1][gx + 1];

          const p1 = applyShape(x0, y0, z00);
          const p2 = applyShape(x1, y0, z10);
          const p3 = applyShape(x1, y1, z11);
          const p4 = applyShape(x0, y1, z01);

          const u0x = gx / gridX, u1x = (gx + 1) / gridX;
          const u0y = 1 - gy / gridY, u1y = 1 - (gy + 1) / gridY;

          addQuad(p1, p2, p3, p4, [u0x, u0y], [u1x, u0y], [u1x, u1y], [u0x, u1y]);
        }
      }

      // Back face (flat at z=0)
      for (let gy = 0; gy < gridY; gy++) {
        for (let gx = 0; gx < gridX; gx++) {
          const x0 = gx * stepX, x1 = (gx + 1) * stepX;
          const y0 = gy * stepY, y1 = (gy + 1) * stepY;

          const p1 = applyShape(x0, y0, 0);
          const p2 = applyShape(x0, y1, 0);
          const p3 = applyShape(x1, y1, 0);
          const p4 = applyShape(x1, y0, 0);

          const u0x = gx / gridX, u1x = (gx + 1) / gridX;
          const u0y = 1 - gy / gridY, u1y = 1 - (gy + 1) / gridY;

          addQuad(p1, p2, p3, p4, [u0x, u0y], [u0x, u1y], [u1x, u1y], [u1x, u0y]);
        }
      }

      // Side walls — left, right, top, bottom
      for (let gy = 0; gy < gridY; gy++) {
        const y0 = gy * stepY, y1 = (gy + 1) * stepY;
        // Left wall (x=0)
        const lf0 = applyShape(0, y0, depths[gy][0]);
        const lf1 = applyShape(0, y1, depths[gy + 1][0]);
        const lb0 = applyShape(0, y0, 0);
        const lb1 = applyShape(0, y1, 0);
        addQuad(lb0, lb1, lf1, lf0, [0, 0], [0, 1], [1, 1], [1, 0]);
        // Right wall (x=max)
        const rf0 = applyShape(w, y0, depths[gy][gridX]);
        const rf1 = applyShape(w, y1, depths[gy + 1][gridX]);
        const rb0 = applyShape(w, y0, 0);
        const rb1 = applyShape(w, y1, 0);
        addQuad(rf0, rf1, rb1, rb0, [0, 0], [0, 1], [1, 1], [1, 0]);
      }
      for (let gx = 0; gx < gridX; gx++) {
        const x0 = gx * stepX, x1 = (gx + 1) * stepX;
        // Bottom wall (y=0)
        const bf0 = applyShape(x0, 0, depths[0][gx]);
        const bf1 = applyShape(x1, 0, depths[0][gx + 1]);
        const bb0 = applyShape(x0, 0, 0);
        const bb1 = applyShape(x1, 0, 0);
        addQuad(bf0, bf1, bb1, bb0, [0, 0], [1, 0], [1, 1], [0, 1]);
        // Top wall (y=max)
        const tf0 = applyShape(x0, h, depths[gridY][gx]);
        const tf1 = applyShape(x1, h, depths[gridY][gx + 1]);
        const tb0 = applyShape(x0, h, 0);
        const tb1 = applyShape(x1, h, 0);
        addQuad(tb0, tb1, tf1, tf0, [0, 0], [1, 0], [1, 1], [0, 1]);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.computeVertexNormals();

      return geometry;
    },
    [scale, minThickness, maxThickness]
  );

  // State for STL generation
  const [isGeneratingSTL, setIsGeneratingSTL] = useState(false);

  // Client-side STL download
  const handleDownloadSTL = useCallback(async () => {
    setIsGeneratingSTL(true);
    try {
      const stlBuffer = await generateLithophaneSTL({
        processedImage,
        lampTemplate,
        dimensions,
        settings: {
          minThickness: 0.6,
          maxThickness: 3.2,
          resolution: 'high',
          border: 2,
          curve: lampTemplate.curve_radius ? Math.min(100, lampTemplate.curve_radius) : 0,
          negative: false,
          smoothing: 20
        }
      });
      const shapeName = lampTemplate.shape_type.replace(/[^a-zA-Z0-9]/g, '_');
      downloadSTL(stlBuffer, `lithophane_${shapeName}_${dimensions.width}x${dimensions.height}mm.stl`);
    } catch (err) {
      logger.error('STL generation error:', err);
    } finally {
      setIsGeneratingSTL(false);
    }
  }, [processedImage, lampTemplate, dimensions]);

  // Create/update lamp mesh — uses real depth displacement from image
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

    // Load image data to extract pixel luminance for depth map
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // If customText is provided, draw it on the image
      ctx.drawImage(img, 0, 0);
      if (customText) {
        const MIN_FONT_SIZE = 14;
        const FONT_SCALE_FACTOR = 0.06;
        const fontSize = Math.max(MIN_FONT_SIZE, Math.floor(img.height * FONT_SCALE_FACTOR));
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(customText, img.width / 2, img.height - fontSize * 0.3, img.width * 0.9);
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Build lithophane geometry with actual depth displacement
      const geometry = buildLithophaneGeometry(
        imageData,
        lampTemplate.shape_type,
        dimensions.width,
        dimensions.height
      );

      // Create texture from the (possibly text-annotated) canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // Material: semi-translucent white plastic (like PLA for 3D printing)
      // The depth variation + back-light creates the lithophane effect
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xf5f5f0,
        map: texture,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0,
        transmission: showLight ? 0.35 : 0.05,
        thickness: 2.5,
        clearcoat: 0.1,
        clearcoatRoughness: 0.4,
        ior: 1.45,
        emissive: new THREE.Color(lightColor),
        emissiveIntensity: showLight ? lightIntensity * 0.12 : 0,
        emissiveMap: texture,
        envMapIntensity: 0.3
      });

      const lamp = new THREE.Mesh(geometry, material);
      lamp.castShadow = true;
      lamp.receiveShadow = true;
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
    };
    img.src = processedImage;

  }, [processedImage, lampTemplate, dimensions, showBase, showLight, lightIntensity, lightColor, buildLithophaneGeometry, customText, scale]);

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

        {/* Download STL Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleDownloadSTL}
            disabled={isGeneratingSTL}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isGeneratingSTL
              ? (language === 'es' ? 'Generando STL...' : 'Generating STL...')
              : (language === 'es' ? 'Descargar STL' : 'Download STL')}
          </Button>
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
          <Badge variant="outline" className="bg-green-500/10 text-green-600">
            LED 16mm ✓
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
