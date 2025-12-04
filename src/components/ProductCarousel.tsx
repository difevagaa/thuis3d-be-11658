import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
interface ProductCarouselProps {
  images: Array<{
    image_url: string;
    display_order: number;
  }>;
  alt: string;
  autoRotate?: boolean;
}
export default function ProductCarousel({
  images,
  alt,
  autoRotate = false
}: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [imageError, setImageError] = useState<Set<number>>(new Set());

  // Preload next image
  useEffect(() => {
    if (images.length <= 1) return;
    const nextIndex = (currentIndex + 1) % images.length;
    if (!loadedImages.has(nextIndex) && !imageError.has(nextIndex)) {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, nextIndex]));
      };
      img.onerror = () => {
        setImageError(prev => new Set([...prev, nextIndex]));
      };
      img.src = images[nextIndex].image_url;
    }
  }, [currentIndex, images, loadedImages, imageError]);

  // Auto-rotation only if enabled (20 seconds for product images)
  useEffect(() => {
    if (!autoRotate || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 20000); // 20 seconds
    return () => clearInterval(interval);
  }, [images.length, autoRotate]);
  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };
  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  };
  if (!images || images.length === 0) {
    return <div className="w-full h-full bg-muted flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Sin imagen</span>
    </div>;
  }
  if (images.length === 1) {
    return <div className="w-full h-full bg-muted flex items-center justify-center">
        {!imageError.has(0) ? <img src={images[0].image_url} alt={`3D printed product: ${alt}`} className="w-full h-full object-cover" onError={() => setImageError(prev => new Set([...prev, 0]))} /> : <Printer className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/30" />}
      </div>;
  }
  const isCurrentImageLoaded = loadedImages.has(currentIndex);
  const hasCurrentImageError = imageError.has(currentIndex);
  return <div className="relative w-full h-full bg-muted flex items-center justify-center">
      {!hasCurrentImageError && isCurrentImageLoaded ? <img src={images[currentIndex].image_url} alt={`3D print view ${currentIndex + 1}: ${alt}`} onError={() => setImageError(prev => new Set([...prev, currentIndex]))} className="w-full h-full object-cover rounded-none shadow-md" /> : hasCurrentImageError ? <Printer className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/30" /> : <div className="w-full h-full bg-muted animate-pulse" />}
      
      <Button variant="ghost" size="icon" className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
      e.preventDefault();
      goToPrevious();
    }}>
        <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
      </Button>
      
      <Button variant="ghost" size="icon" className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
      e.preventDefault();
      goToNext();
    }}>
        <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
      </Button>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 md:gap-2">
        {images.map((_, index) => <button key={index} onClick={e => {
        e.preventDefault();
        setCurrentIndex(index);
      }} className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${index === currentIndex ? 'bg-white w-3 md:w-4' : 'bg-white/50 hover:bg-white/75'}`} />)}
      </div>
    </div>;
}