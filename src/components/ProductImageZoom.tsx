import { useState, useRef, useCallback } from "react";
import { ZoomIn } from "lucide-react";

interface ProductImageZoomProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProductImageZoom({ src, alt, className = "" }: ProductImageZoomProps) {
  const [isZooming, setIsZooming] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const ZOOM = 2.5;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setLensPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setBgPos({ x, y });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden group cursor-crosshair ${className}`}
      onMouseEnter={() => setIsZooming(true)}
      onMouseLeave={() => setIsZooming(false)}
      onMouseMove={handleMouseMove}
    >
      <img src={src} alt={alt} className="w-full h-full object-contain" style={{ display: 'block' }} />

      {/* Zoom hint icon */}
      {!isZooming && (
        <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ZoomIn className="w-4 h-4" />
        </div>
      )}

      {/* Magnifier lens overlay */}
      {isZooming && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-primary/60 shadow-lg overflow-hidden"
          style={{
            width: 140,
            height: 140,
            left: lensPos.x - 70,
            top: lensPos.y - 70,
            backgroundImage: `url(${src})`,
            backgroundSize: `${ZOOM * 100}%`,
            backgroundPosition: `${bgPos.x}% ${bgPos.y}%`,
            backgroundRepeat: 'no-repeat',
            zIndex: 30,
          }}
        />
      )}
    </div>
  );
}
