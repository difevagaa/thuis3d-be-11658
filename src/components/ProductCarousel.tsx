import { useState, useEffect, useCallback } from "react";
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
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [imageError, setImageError] = useState<Set<number>>(new Set());

  // Preload ALL images at once to prevent flickering
  useEffect(() => {
    if (images.length === 0) return;
    
    images.forEach((image, index) => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, index]));
      };
      img.onerror = () => {
        setImageError(prev => new Set([...prev, index]));
      };
      img.src = image.image_url;
    });
  }, [images]);

  // Disable auto-rotation to prevent flickering
  // Users can navigate manually with arrows
  useEffect(() => {
    if (!autoRotate || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [images.length, autoRotate]);
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);
  
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  }, [images.length]);
  
  if (!images || images.length === 0) {
    return <div className="w-full h-full bg-muted flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Sin imagen</span>
    </div>;
  }
  if (images.length === 1) {
    return <div className="w-full h-full bg-muted flex items-center justify-center">
        {!imageError.has(0) ? <img src={images[0].image_url} alt={alt} className="w-full h-full object-cover" onError={() => setImageError(prev => new Set([...prev, 0]))} /> : <Printer className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/30" />}
      </div>;
  }
  const isCurrentImageLoaded = loadedImages.has(currentIndex);
  const hasCurrentImageError = imageError.has(currentIndex);
  return <div className="relative w-full h-full bg-muted flex items-center justify-center group">
      {!hasCurrentImageError && isCurrentImageLoaded ? <img 
        key={currentIndex}
        src={images[currentIndex].image_url} 
        alt={`${alt} - imagen ${currentIndex + 1}`} 
        onError={() => setImageError(prev => new Set([...prev, currentIndex]))} 
        className="w-full h-full object-cover rounded-none shadow-md transition-opacity duration-300" 
      /> : hasCurrentImageError ? <Printer className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/30" /> : <div className="w-full h-full bg-muted animate-pulse" />}
      
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
    </div>;
}