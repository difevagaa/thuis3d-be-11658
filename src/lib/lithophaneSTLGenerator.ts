/**
 * Lithophane STL Generator
 * Converts processed images into 3D lithophane STL files
 */

import type { LampTemplate } from '@/pages/Lithophany';

interface STLGenerationOptions {
  processedImage: string;
  lampTemplate: LampTemplate;
  dimensions: { width: number; height: number };
  settings: {
    minThickness: number;  // mm
    maxThickness: number;  // mm
    resolution: 'low' | 'medium' | 'high' | 'ultra';
    border: number;  // mm
    curve: number;  // 0-100 for curved surfaces
    negative: boolean;  // invert depth
    smoothing: number;  // 0-100
  };
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
  normal: Vector3;
}

/**
 * Main function to generate lithophane STL from processed image
 */
export async function generateLithophaneSTL(options: STLGenerationOptions): Promise<ArrayBuffer> {
  const {
    processedImage,
    lampTemplate,
    dimensions,
    settings
  } = options;

  // Load and analyze the processed image
  const imageData = await loadImageData(processedImage);
  
  // Get resolution parameters
  const resolution = getResolutionParams(settings.resolution);
  
  // Calculate grid dimensions based on physical dimensions and resolution
  const gridWidth = Math.floor((dimensions.width / resolution.stepSize));
  const gridHeight = Math.floor((dimensions.height / resolution.stepSize));
  
  // Sample image at grid points and convert to depth map
  const depthMap = createDepthMap(imageData, gridWidth, gridHeight, settings);
  
  // Apply smoothing if requested
  if (settings.smoothing > 0) {
    smoothDepthMap(depthMap, settings.smoothing / 100);
  }
  
  // Generate triangles based on lamp shape type
  const triangles = generateGeometry(
    depthMap,
    gridWidth,
    gridHeight,
    dimensions,
    settings,
    lampTemplate.shape_type
  );
  
  // Convert triangles to binary STL format
  const stlBuffer = createBinarySTL(triangles);
  
  return stlBuffer;
}

/**
 * Load image and convert to ImageData
 */
async function loadImageData(imageDataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Get resolution parameters
 */
function getResolutionParams(resolution: 'low' | 'medium' | 'high' | 'ultra') {
  const params = {
    low: { stepSize: 2.0, label: 'Low (fast)' },
    medium: { stepSize: 1.0, label: 'Medium' },
    high: { stepSize: 0.5, label: 'High' },
    ultra: { stepSize: 0.25, label: 'Ultra (slow)' }
  };
  return params[resolution];
}

/**
 * Create depth map from image luminance
 */
function createDepthMap(
  imageData: ImageData,
  gridWidth: number,
  gridHeight: number,
  settings: STLGenerationOptions['settings']
): number[][] {
  const depthMap: number[][] = [];
  const { minThickness, maxThickness, negative } = settings;
  const thicknessRange = maxThickness - minThickness;
  
  // Sample image at grid points
  for (let y = 0; y < gridHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < gridWidth; x++) {
      // Calculate corresponding position in image
      const imgX = Math.floor((x / gridWidth) * imageData.width);
      const imgY = Math.floor((y / gridHeight) * imageData.height);
      const idx = (imgY * imageData.width + imgX) * 4;
      
      // Calculate luminance (brightness) from RGB
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Convert luminance to depth
      // Bright areas = thin (more light passes through)
      // Dark areas = thick (less light passes through)
      let depth = negative
        ? minThickness + (luminance * thicknessRange)
        : minThickness + ((1 - luminance) * thicknessRange);
      
      row.push(depth);
    }
    depthMap.push(row);
  }
  
  return depthMap;
}

/**
 * Apply Gaussian smoothing to depth map
 */
function smoothDepthMap(depthMap: number[][], amount: number): void {
  if (amount === 0) return;
  
  const height = depthMap.length;
  const width = depthMap[0].length;
  const kernelSize = Math.max(1, Math.floor(amount * 5));
  const smoothed: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      
      // Apply kernel
      for (let ky = -kernelSize; ky <= kernelSize; ky++) {
        for (let kx = -kernelSize; kx <= kernelSize; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += depthMap[ny][nx];
            count++;
          }
        }
      }
      
      row.push(sum / count);
    }
    smoothed.push(row);
  }
  
  // Copy smoothed values back
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      depthMap[y][x] = smoothed[y][x];
    }
  }
}

/**
 * Generate 3D geometry from depth map
 */
function generateGeometry(
  depthMap: number[][],
  gridWidth: number,
  gridHeight: number,
  dimensions: { width: number; height: number },
  settings: STLGenerationOptions['settings'],
  shapeType: string
): Triangle[] {
  const triangles: Triangle[] = [];
  const { width, height } = dimensions;
  const { border, curve } = settings;
  
  // Physical step size in mm
  const stepX = width / (gridWidth - 1);
  const stepY = height / (gridHeight - 1);
  
  // Apply curvature based on shape type
  const applyShape = getShapeFunction(shapeType, width, height, curve / 100);
  
  // Generate mesh grid
  for (let y = 0; y < gridHeight - 1; y++) {
    for (let x = 0; x < gridWidth - 1; x++) {
      // Get four corners of this quad
      const x0 = x * stepX - width / 2;
      const x1 = (x + 1) * stepX - width / 2;
      const y0 = y * stepY - height / 2;
      const y1 = (y + 1) * stepY - height / 2;
      
      // Get depths at four corners
      const z00 = depthMap[y][x];
      const z10 = depthMap[y][x + 1];
      const z01 = depthMap[y + 1][x];
      const z11 = depthMap[y + 1][x + 1];
      
      // Apply shape transformation
      const v00 = applyShape({ x: x0, y: y0, z: z00 });
      const v10 = applyShape({ x: x1, y: y0, z: z10 });
      const v01 = applyShape({ x: x0, y: y1, z: z01 });
      const v11 = applyShape({ x: x1, y: y1, z: z11 });
      
      // Create two triangles for this quad
      triangles.push(createTriangle(v00, v10, v11));
      triangles.push(createTriangle(v00, v11, v01));
    }
  }
  
  // Add border/frame if specified
  if (border > 0) {
    addBorder(triangles, gridWidth, gridHeight, dimensions, border, depthMap, applyShape);
  }
  
  // Add back plate (flat backing)
  addBackPlate(triangles, gridWidth, gridHeight, dimensions, settings.maxThickness, applyShape);
  
  return triangles;
}

/**
 * Get shape transformation function based on lamp type
 */
function getShapeFunction(
  shapeType: string,
  width: number,
  height: number,
  curveAmount: number
): (v: Vector3) => Vector3 {
  switch (shapeType) {
    case 'curved_soft': {
      return (v: Vector3) => ({
        x: v.x,
        y: v.y,
        z: v.z + Math.sin(((v.x + width / 2) / width) * Math.PI) * width * 0.15
      });
    }
    case 'curved_deep':
    case 'arch': {
      return (v: Vector3) => ({
        x: v.x,
        y: v.y,
        z: v.z + Math.sin(((v.x + width / 2) / width) * Math.PI) * width * 0.3
      });
    }
    case 'half_cylinder': {
      const radius = width / Math.PI;
      return (v: Vector3) => {
        const angle = ((v.x + width / 2) / width) * Math.PI;
        return {
          x: Math.cos(angle) * (radius + v.z),
          y: v.y,
          z: Math.sin(angle) * (radius + v.z)
        };
      };
    }
    case 'cylinder_small':
    case 'cylinder_medium':
    case 'cylinder_large': {
      const cylRadius = width / (2 * Math.PI);
      return (v: Vector3) => {
        const angle = ((v.x + width / 2) / width) * Math.PI * 2;
        return {
          x: Math.cos(angle) * (cylRadius + v.z),
          y: v.y,
          z: Math.sin(angle) * (cylRadius + v.z)
        };
      };
    }
    case 'hexagonal': {
      const segments = 6;
      const radius = width / (2 * Math.PI);
      return (v: Vector3) => {
        const angle = ((v.x + width / 2) / width) * Math.PI * 2;
        const segAngle = Math.PI * 2 / segments;
        const seg = Math.floor(angle / segAngle);
        const localAngle = seg * segAngle + (angle % segAngle);
        return {
          x: Math.cos(localAngle) * (radius + v.z),
          y: v.y,
          z: Math.sin(localAngle) * (radius + v.z)
        };
      };
    }
    case 'octagonal': {
      const segments = 8;
      const radius = width / (2 * Math.PI);
      return (v: Vector3) => {
        const angle = ((v.x + width / 2) / width) * Math.PI * 2;
        const segAngle = Math.PI * 2 / segments;
        const seg = Math.floor(angle / segAngle);
        const localAngle = seg * segAngle + (angle % segAngle);
        return {
          x: Math.cos(localAngle) * (radius + v.z),
          y: v.y,
          z: Math.sin(localAngle) * (radius + v.z)
        };
      };
    }
    case 'moon': {
      const cx = 0, cy = 0;
      const rad = Math.min(width, height) / 2;
      return (v: Vector3) => {
        const dx = v.x - cx, dy = v.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sphereZ = dist < rad ? Math.sqrt(Math.max(0, rad * rad - dist * dist)) * 0.35 : 0;
        return { x: v.x, y: v.y, z: v.z + sphereZ };
      };
    }
    case 'wave': {
      return (v: Vector3) => ({
        x: v.x,
        y: v.y,
        z: v.z + Math.sin(((v.x + width / 2) / width) * Math.PI * 3) * width * 0.08
      });
    }
    case 'heart': {
      const hw = width / 2, hh = height / 2;
      return (v: Vector3) => {
        const nx = v.x / hw, ny = v.y / hh;
        const bulge = 0.1 * width * Math.max(0, 1 - nx * nx - ny * ny);
        return { x: v.x, y: v.y, z: v.z + bulge };
      };
    }
    case 'star': {
      const maxDist = Math.sqrt((width / 2) * (width / 2) + (height / 2) * (height / 2));
      return (v: Vector3) => {
        const dist = Math.sqrt(v.x * v.x + v.y * v.y);
        const bulge = 0.05 * width * Math.max(0, 1 - dist / maxDist);
        return { x: v.x, y: v.y, z: v.z + bulge };
      };
    }
    case 'diamond': {
      return (v: Vector3) => {
        const dx = Math.abs(v.x) / (width / 2);
        const dy = Math.abs(v.y) / (height / 2);
        const peak = 0.1 * width * Math.max(0, 1 - Math.max(dx, dy));
        return { x: v.x, y: v.y, z: v.z + peak };
      };
    }
    case 'cloud': {
      return (v: Vector3) => {
        const bump1 = Math.sin(((v.x + width / 2) / width) * Math.PI * 2) * Math.sin(((v.y + height / 2) / height) * Math.PI);
        const bump2 = Math.sin(((v.x + width / 2) / width) * Math.PI * 3) * Math.cos(((v.y + height / 2) / height) * Math.PI * 1.5);
        const cloudZ = (bump1 + bump2 * 0.5) * width * 0.06;
        return { x: v.x, y: v.y, z: v.z + cloudZ };
      };
    }
    case 'gothic': {
      return (v: Vector3) => {
        const ny = (v.y + height / 2) / height;
        if (ny > 0.5) {
          const prog = (ny - 0.5) * 2;
          const nx = Math.abs(v.x) / (width / 2);
          const archZ = prog * (1 - nx) * width * 0.15;
          return { x: v.x, y: v.y, z: v.z + archZ };
        }
        return v;
      };
    }
    case 'ornamental':
    case 'framed_square': {
      return (v: Vector3) => {
        const edgeDist = Math.min(
          v.x + width / 2, width / 2 - v.x,
          v.y + height / 2, height / 2 - v.y
        );
        const maxEdge = Math.min(width, height) * 0.1;
        const frameZ = edgeDist < maxEdge ? (maxEdge - edgeDist) * 0.05 : 0;
        return { x: v.x, y: v.y, z: v.z + frameZ };
      };
    }
    case 'circular': {
      const rad = Math.min(width, height) / 2;
      return (v: Vector3) => {
        const dist = Math.sqrt(v.x * v.x + v.y * v.y);
        const domeZ = dist < rad ? Math.sqrt(Math.max(0, rad * rad - dist * dist)) * 0.1 : 0;
        return { x: v.x, y: v.y, z: v.z + domeZ };
      };
    }
    // For flat shapes and others, no transformation
    default:
      return (v: Vector3) => v;
  }
}

/**
 * Create a triangle with calculated normal
 */
function createTriangle(v1: Vector3, v2: Vector3, v3: Vector3): Triangle {
  // Calculate normal using cross product
  const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
  
  const normal = {
    x: edge1.y * edge2.z - edge1.z * edge2.y,
    y: edge1.z * edge2.x - edge1.x * edge2.z,
    z: edge1.x * edge2.y - edge1.y * edge2.x
  };
  
  // Normalize
  const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  if (length > 0) {
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
  }
  
  return { v1, v2, v3, normal };
}

/**
 * Add border around the lithophane
 */
function addBorder(
  triangles: Triangle[],
  gridWidth: number,
  gridHeight: number,
  dimensions: { width: number; height: number },
  borderWidth: number,
  depthMap: number[][],
  applyShape: (v: Vector3) => Vector3
): void {
  const { width, height } = dimensions;
  const stepX = width / (gridWidth - 1);
  const stepY = height / (gridHeight - 1);
  const halfW = width / 2;
  const halfH = height / 2;
  const maxZ = Math.max(...depthMap.flat());

  // Build border walls on each edge connecting front face to back face at full thickness

  // Bottom edge (y = 0)
  for (let x = 0; x < gridWidth - 1; x++) {
    const x0 = x * stepX - halfW;
    const x1 = (x + 1) * stepX - halfW;
    const y0 = -halfH;
    const z0 = depthMap[0][x];
    const z1 = depthMap[0][x + 1];
    // Front-to-border-top quad
    const p1 = applyShape({ x: x0, y: y0 - borderWidth, z: maxZ });
    const p2 = applyShape({ x: x1, y: y0 - borderWidth, z: maxZ });
    const p3 = applyShape({ x: x1, y: y0, z: z1 });
    const p4 = applyShape({ x: x0, y: y0, z: z0 });
    triangles.push(createTriangle(p1, p2, p3));
    triangles.push(createTriangle(p1, p3, p4));
    // Border outer face
    const p5 = applyShape({ x: x0, y: y0 - borderWidth, z: 0 });
    const p6 = applyShape({ x: x1, y: y0 - borderWidth, z: 0 });
    triangles.push(createTriangle(p5, p1, p4));
    triangles.push(createTriangle(p5, p4, applyShape({ x: x0, y: y0, z: 0 })));
    triangles.push(createTriangle(p6, p5, applyShape({ x: x1, y: y0, z: 0 })));
    // Top of border
    triangles.push(createTriangle(p1, p5, p6));
    triangles.push(createTriangle(p1, p6, p2));
  }

  // Top edge (y = max)
  for (let x = 0; x < gridWidth - 1; x++) {
    const x0 = x * stepX - halfW;
    const x1 = (x + 1) * stepX - halfW;
    const y0 = halfH;
    const z0 = depthMap[gridHeight - 1][x];
    const z1 = depthMap[gridHeight - 1][x + 1];
    const p1 = applyShape({ x: x0, y: y0, z: z0 });
    const p2 = applyShape({ x: x1, y: y0, z: z1 });
    const p3 = applyShape({ x: x1, y: y0 + borderWidth, z: maxZ });
    const p4 = applyShape({ x: x0, y: y0 + borderWidth, z: maxZ });
    triangles.push(createTriangle(p1, p2, p3));
    triangles.push(createTriangle(p1, p3, p4));
    const p5 = applyShape({ x: x0, y: y0 + borderWidth, z: 0 });
    const p6 = applyShape({ x: x1, y: y0 + borderWidth, z: 0 });
    triangles.push(createTriangle(p4, p3, p6));
    triangles.push(createTriangle(p4, p6, p5));
  }

  // Left edge (x = 0)
  for (let y = 0; y < gridHeight - 1; y++) {
    const y0 = y * stepY - halfH;
    const y1 = (y + 1) * stepY - halfH;
    const x0 = -halfW;
    const z0 = depthMap[y][0];
    const z1 = depthMap[y + 1][0];
    const p1 = applyShape({ x: x0 - borderWidth, y: y0, z: maxZ });
    const p2 = applyShape({ x: x0 - borderWidth, y: y1, z: maxZ });
    const p3 = applyShape({ x: x0, y: y1, z: z1 });
    const p4 = applyShape({ x: x0, y: y0, z: z0 });
    triangles.push(createTriangle(p1, p2, p3));
    triangles.push(createTriangle(p1, p3, p4));
    const p5 = applyShape({ x: x0 - borderWidth, y: y0, z: 0 });
    const p6 = applyShape({ x: x0 - borderWidth, y: y1, z: 0 });
    triangles.push(createTriangle(p1, p5, p6));
    triangles.push(createTriangle(p1, p6, p2));
  }

  // Right edge (x = max)
  for (let y = 0; y < gridHeight - 1; y++) {
    const y0 = y * stepY - halfH;
    const y1 = (y + 1) * stepY - halfH;
    const x0 = halfW;
    const z0 = depthMap[y][gridWidth - 1];
    const z1 = depthMap[y + 1][gridWidth - 1];
    const p1 = applyShape({ x: x0, y: y0, z: z0 });
    const p2 = applyShape({ x: x0, y: y1, z: z1 });
    const p3 = applyShape({ x: x0 + borderWidth, y: y1, z: maxZ });
    const p4 = applyShape({ x: x0 + borderWidth, y: y0, z: maxZ });
    triangles.push(createTriangle(p1, p2, p3));
    triangles.push(createTriangle(p1, p3, p4));
    const p5 = applyShape({ x: x0 + borderWidth, y: y0, z: 0 });
    const p6 = applyShape({ x: x0 + borderWidth, y: y1, z: 0 });
    triangles.push(createTriangle(p4, p3, p6));
    triangles.push(createTriangle(p4, p6, p5));
  }
}

/**
 * Add solid back plate
 */
function addBackPlate(
  triangles: Triangle[],
  gridWidth: number,
  gridHeight: number,
  dimensions: { width: number; height: number },
  thickness: number,
  applyShape: (v: Vector3) => Vector3
): void {
  const { width, height } = dimensions;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  // Create flat back at max thickness
  const v1 = applyShape({ x: -halfWidth, y: -halfHeight, z: thickness });
  const v2 = applyShape({ x: halfWidth, y: -halfHeight, z: thickness });
  const v3 = applyShape({ x: halfWidth, y: halfHeight, z: thickness });
  const v4 = applyShape({ x: -halfWidth, y: halfHeight, z: thickness });
  
  // Two triangles for the back face
  triangles.push(createTriangle(v1, v3, v2));
  triangles.push(createTriangle(v1, v4, v3));
}

/**
 * Convert triangles to binary STL format
 */
function createBinarySTL(triangles: Triangle[]): ArrayBuffer {
  // STL format:
  // - 80 bytes header
  // - 4 bytes: number of triangles (uint32)
  // - For each triangle (50 bytes):
  //   - 12 bytes: normal vector (3 x float32)
  //   - 36 bytes: 3 vertices (9 x float32)
  //   - 2 bytes: attribute byte count (uint16)
  
  const headerSize = 80;
  const triangleSize = 50;
  const bufferSize = headerSize + 4 + (triangles.length * triangleSize);
  
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // Write header (80 bytes of zeros)
  const header = 'Generated by Thuis3D Lithophane Creator';
  for (let i = 0; i < Math.min(80, header.length); i++) {
    view.setUint8(i, header.charCodeAt(i));
  }
  
  // Write number of triangles
  view.setUint32(80, triangles.length, true);
  
  // Write each triangle
  let offset = 84;
  for (const triangle of triangles) {
    // Normal
    view.setFloat32(offset, triangle.normal.x, true);
    view.setFloat32(offset + 4, triangle.normal.y, true);
    view.setFloat32(offset + 8, triangle.normal.z, true);
    offset += 12;
    
    // Vertex 1
    view.setFloat32(offset, triangle.v1.x, true);
    view.setFloat32(offset + 4, triangle.v1.y, true);
    view.setFloat32(offset + 8, triangle.v1.z, true);
    offset += 12;
    
    // Vertex 2
    view.setFloat32(offset, triangle.v2.x, true);
    view.setFloat32(offset + 4, triangle.v2.y, true);
    view.setFloat32(offset + 8, triangle.v2.z, true);
    offset += 12;
    
    // Vertex 3
    view.setFloat32(offset, triangle.v3.x, true);
    view.setFloat32(offset + 4, triangle.v3.y, true);
    view.setFloat32(offset + 8, triangle.v3.z, true);
    offset += 12;
    
    // Attribute byte count (unused, set to 0)
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  
  return buffer;
}

/**
 * Generate base STL (integrated with lithophane panel)
 * Based on BambuStudio lithophane base design
 */
export async function generateBaseSTL(
  lampTemplate: LampTemplate,
  dimensions: { width: number; height: number },
  baseSettings: {
    width: number;
    height: number;
    depth: number;
    slotWidth: number;
    slotDepth: number;
    ledHoleDiameter: number;
    ledHoleDepth: number;
  }
): Promise<ArrayBuffer> {
  const triangles: Triangle[] = [];
  
  const { width, height, depth, slotWidth, slotDepth, ledHoleDiameter, ledHoleDepth } = baseSettings;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const slotHalfWidth = slotWidth / 2;
  
  // Base platform vertices
  const baseTop = 0;
  const baseBottom = -height;
  
  // Top surface of base (with slot cutout)
  // Front section (before slot)
  const frontDepth = halfDepth - slotDepth / 2;
  
  // Create base top surface (rectangular with slot)
  // Front rectangle
  addRectangle(triangles,
    { x: -halfWidth, y: frontDepth, z: baseTop },
    { x: halfWidth, y: frontDepth, z: baseTop },
    { x: halfWidth, y: halfDepth, z: baseTop },
    { x: -halfWidth, y: halfDepth, z: baseTop }
  );
  
  // Back rectangle  
  addRectangle(triangles,
    { x: -halfWidth, y: -halfDepth, z: baseTop },
    { x: halfWidth, y: -halfDepth, z: baseTop },
    { x: halfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: -halfWidth, y: -halfDepth + frontDepth, z: baseTop }
  );
  
  // Left side of slot
  addRectangle(triangles,
    { x: -halfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: -slotHalfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: -slotHalfWidth, y: frontDepth, z: baseTop },
    { x: -halfWidth, y: frontDepth, z: baseTop }
  );
  
  // Right side of slot
  addRectangle(triangles,
    { x: slotHalfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: halfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: halfWidth, y: frontDepth, z: baseTop },
    { x: slotHalfWidth, y: frontDepth, z: baseTop }
  );
  
  // Slot interior walls
  const slotBottom = baseTop - slotDepth;
  
  // Slot back wall
  addRectangle(triangles,
    { x: -slotHalfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: slotHalfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: slotHalfWidth, y: -halfDepth + frontDepth, z: slotBottom },
    { x: -slotHalfWidth, y: -halfDepth + frontDepth, z: slotBottom }
  );
  
  // Slot front wall
  addRectangle(triangles,
    { x: slotHalfWidth, y: frontDepth, z: baseTop },
    { x: -slotHalfWidth, y: frontDepth, z: baseTop },
    { x: -slotHalfWidth, y: frontDepth, z: slotBottom },
    { x: slotHalfWidth, y: frontDepth, z: slotBottom }
  );
  
  // Slot left wall (inner)
  addRectangle(triangles,
    { x: -slotHalfWidth, y: frontDepth, z: baseTop },
    { x: -slotHalfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: -slotHalfWidth, y: -halfDepth + frontDepth, z: slotBottom },
    { x: -slotHalfWidth, y: frontDepth, z: slotBottom }
  );
  
  // Slot right wall (inner)
  addRectangle(triangles,
    { x: slotHalfWidth, y: -halfDepth + frontDepth, z: baseTop },
    { x: slotHalfWidth, y: frontDepth, z: baseTop },
    { x: slotHalfWidth, y: frontDepth, z: slotBottom },
    { x: slotHalfWidth, y: -halfDepth + frontDepth, z: slotBottom }
  );
  
  // Slot bottom (with LED hole)
  addSlotBottomWithLEDHole(triangles, slotHalfWidth, frontDepth, -halfDepth + frontDepth, slotBottom, ledHoleDiameter / 2);
  
  // Base exterior walls
  // Front wall
  addRectangle(triangles,
    { x: -halfWidth, y: halfDepth, z: baseTop },
    { x: halfWidth, y: halfDepth, z: baseTop },
    { x: halfWidth, y: halfDepth, z: baseBottom },
    { x: -halfWidth, y: halfDepth, z: baseBottom }
  );
  
  // Back wall
  addRectangle(triangles,
    { x: halfWidth, y: -halfDepth, z: baseTop },
    { x: -halfWidth, y: -halfDepth, z: baseTop },
    { x: -halfWidth, y: -halfDepth, z: baseBottom },
    { x: halfWidth, y: -halfDepth, z: baseBottom }
  );
  
  // Left wall
  addRectangle(triangles,
    { x: -halfWidth, y: -halfDepth, z: baseTop },
    { x: -halfWidth, y: halfDepth, z: baseTop },
    { x: -halfWidth, y: halfDepth, z: baseBottom },
    { x: -halfWidth, y: -halfDepth, z: baseBottom }
  );
  
  // Right wall
  addRectangle(triangles,
    { x: halfWidth, y: halfDepth, z: baseTop },
    { x: halfWidth, y: -halfDepth, z: baseTop },
    { x: halfWidth, y: -halfDepth, z: baseBottom },
    { x: halfWidth, y: halfDepth, z: baseBottom }
  );
  
  // Bottom
  addRectangle(triangles,
    { x: -halfWidth, y: -halfDepth, z: baseBottom },
    { x: halfWidth, y: -halfDepth, z: baseBottom },
    { x: halfWidth, y: halfDepth, z: baseBottom },
    { x: -halfWidth, y: halfDepth, z: baseBottom }
  );
  
  return createBinarySTL(triangles);
}

/**
 * Helper: Add a rectangular face (two triangles)
 */
function addRectangle(
  triangles: Triangle[],
  v1: Vector3,
  v2: Vector3,
  v3: Vector3,
  v4: Vector3
): void {
  triangles.push(createTriangle(v1, v2, v3));
  triangles.push(createTriangle(v1, v3, v4));
}

/**
 * Add slot bottom with LED mounting hole
 */
function addSlotBottomWithLEDHole(
  triangles: Triangle[],
  slotHalfWidth: number,
  frontY: number,
  backY: number,
  z: number,
  ledRadius: number
): void {
  // For simplicity, create bottom with hole as segmented rectangles
  // In production, would create proper circular hole with segments
  
  const centerY = (frontY + backY) / 2;
  const segments = 16;
  
  // Create rectangles around the hole
  // Left section
  addRectangle(triangles,
    { x: -slotHalfWidth, y: backY, z },
    { x: -ledRadius, y: backY, z },
    { x: -ledRadius, y: frontY, z },
    { x: -slotHalfWidth, y: frontY, z }
  );
  
  // Right section
  addRectangle(triangles,
    { x: ledRadius, y: backY, z },
    { x: slotHalfWidth, y: backY, z },
    { x: slotHalfWidth, y: frontY, z },
    { x: ledRadius, y: frontY, z }
  );
  
  // Front section (above hole)
  addRectangle(triangles,
    { x: -ledRadius, y: centerY + ledRadius, z },
    { x: ledRadius, y: centerY + ledRadius, z },
    { x: ledRadius, y: frontY, z },
    { x: -ledRadius, y: frontY, z }
  );
  
  // Back section (below hole)
  addRectangle(triangles,
    { x: -ledRadius, y: backY, z },
    { x: ledRadius, y: backY, z },
    { x: ledRadius, y: centerY - ledRadius, z },
    { x: -ledRadius, y: centerY - ledRadius, z }
  );
}

/**
 * Generate combined STL: lithophane panel + base
 * This is what admins will download
 */
export async function generateCombinedSTL(options: STLGenerationOptions): Promise<ArrayBuffer> {
  // Generate lithophane panel
  const panelBuffer = await generateLithophaneSTL(options);
  
  // Calculate base dimensions based on lamp template
  const baseWidth = options.dimensions.width * 1.3; // 30% wider than panel
  const baseHeight = 18; // Standard base height
  const baseDepth = 28; // Standard base depth
  const slotWidth = options.dimensions.width + 1; // 1mm clearance
  const slotDepth = options.settings.maxThickness + 0.5; // 0.5mm clearance
  const ledHoleDiameter = 16; // Standard 16mm LED
  const ledHoleDepth = 10; // 10mm deep
  
  // Generate base
  const baseBuffer = await generateBaseSTL(
    options.lampTemplate,
    options.dimensions,
    {
      width: baseWidth,
      height: baseHeight,
      depth: baseDepth,
      slotWidth,
      slotDepth,
      ledHoleDiameter,
      ledHoleDepth
    }
  );
  
  // Combine both STL files
  return combineSTLBuffers(panelBuffer, baseBuffer);
}

/**
 * Combine two STL buffers into one
 */
function combineSTLBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
  const view1 = new DataView(buffer1);
  const view2 = new DataView(buffer2);
  
  // Read triangle counts
  const count1 = view1.getUint32(80, true);
  const count2 = view2.getUint32(80, true);
  const totalCount = count1 + count2;
  
  // Create new buffer
  const headerSize = 80;
  const triangleSize = 50;
  const newSize = headerSize + 4 + (totalCount * triangleSize);
  const newBuffer = new ArrayBuffer(newSize);
  const newView = new DataView(newBuffer);
  
  // Write header
  const header = 'Combined Lithophane + Base by Thuis3D';
  for (let i = 0; i < Math.min(80, header.length); i++) {
    newView.setUint8(i, header.charCodeAt(i));
  }
  
  // Write total count
  newView.setUint32(80, totalCount, true);
  
  // Copy triangles from first buffer
  let offset = 84;
  for (let i = 0; i < count1 * triangleSize; i++) {
    newView.setUint8(offset + i, view1.getUint8(84 + i));
  }
  offset += count1 * triangleSize;
  
  // Copy triangles from second buffer  
  for (let i = 0; i < count2 * triangleSize; i++) {
    newView.setUint8(offset + i, view2.getUint8(84 + i));
  }
  
  return newBuffer;
}

/**
 * Download STL file
 */
export function downloadSTL(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
