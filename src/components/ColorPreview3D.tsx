import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ColorPreview3DProps {
  color: string;
  className?: string;
}

export function ColorPreview3D({ color, className = "" }: ColorPreview3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    benchy?: THREE.Mesh;
    animationId?: number;
  }>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, 3, -5);
    scene.add(directionalLight2);

    // Create simplified Benchy boat shape
    const benchyGroup = new THREE.Group();

    // Hull (main body)
    const hullGeometry = new THREE.BoxGeometry(1.2, 0.4, 1.8);
    const hullMaterial = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color(color),
      shininess: 30
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.set(0, 0, 0);
    hull.castShadow = true;
    benchyGroup.add(hull);

    // Cabin
    const cabinGeometry = new THREE.BoxGeometry(0.7, 0.5, 0.8);
    const cabin = new THREE.Mesh(cabinGeometry, hullMaterial);
    cabin.position.set(0, 0.45, -0.2);
    cabin.castShadow = true;
    benchyGroup.add(cabin);

    // Roof
    const roofGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.9);
    const roof = new THREE.Mesh(roofGeometry, hullMaterial);
    roof.position.set(0, 0.75, -0.2);
    roof.castShadow = true;
    benchyGroup.add(roof);

    // Chimney
    const chimneyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16);
    const chimney = new THREE.Mesh(chimneyGeometry, hullMaterial);
    chimney.position.set(0.15, 0.95, -0.3);
    chimney.castShadow = true;
    benchyGroup.add(chimney);

    // Bow (front)
    const bowGeometry = new THREE.ConeGeometry(0.6, 0.5, 4);
    const bow = new THREE.Mesh(bowGeometry, hullMaterial);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(0, 0, 1.15);
    bow.castShadow = true;
    benchyGroup.add(bow);

    // Position and rotate the benchy
    benchyGroup.position.set(0, -0.2, 0);
    benchyGroup.rotation.y = Math.PI / 6; // Slight angle for better view

    scene.add(benchyGroup);

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      benchy: benchyGroup,
    };

    // Mouse interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = () => {
      isDragging = true;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sceneRef.current.benchy) return;

      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y,
      };

      sceneRef.current.benchy.rotation.y += deltaMove.x * 0.01;
      sceneRef.current.benchy.rotation.x += deltaMove.y * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);

    // Animation loop
    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate);
      
      // Auto-rotate slowly when not dragging
      if (!isDragging && sceneRef.current.benchy) {
        sceneRef.current.benchy.rotation.y += 0.005;
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
      // Use captured container variable for cleanup
      if (container?.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [color]);

  // Update color when it changes
  useEffect(() => {
    if (sceneRef.current.benchy) {
      const newColor = new THREE.Color(color);
      sceneRef.current.benchy.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
          child.material.color = newColor;
        }
      });
    }
  }, [color]);

  return (
    <div className={className}>
      <div 
        ref={containerRef} 
        className="w-full h-64 rounded-lg border bg-muted/30 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />
      <p className="text-xs text-center text-muted-foreground mt-2">
        Arrastra para rotar • Vista previa de color
      </p>
    </div>
  );
}
