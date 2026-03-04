import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Play, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  display_order: number;
}

export default function Gallery() {
  const { t } = useTranslation('gallery');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const loadGalleryItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as GalleryItem[]);
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadGalleryItems();
  }, [loadGalleryItems]);

  const handleVideoPlay = (itemId: string) => {
    setPlayingVideos(prev => new Set(prev).add(itemId));
  };

  const handleVideoPause = (itemId: string) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const openLightbox = (item: GalleryItem) => {
    setSelectedItem(item);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setSelectedItem(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomLevel <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handlePointerUp = () => setIsPanning(false);

  return (
    <>
      <SEOHead 
        title={t('title')}
        description={t('seoDescription')}
      />
      
      <div className="page-section pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6 text-center">{t('title')}</h1>
          
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
              <p className="text-xs md:text-sm text-muted-foreground text-center leading-relaxed">
                <strong className="text-foreground">{t('legalTitle')}</strong><br />
                {t('legalText')}
              </p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
            {items.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => openLightbox(item)}
              >
                <div className="relative aspect-video bg-background">
                  {item.media_type === 'image' ? (
                    <>
                      <img
                        src={item.media_url}
                        alt={item.title}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      {/* Zoom icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                        <ZoomIn className="w-10 h-10 text-white opacity-0 group-hover:opacity-90 transition-opacity duration-300 drop-shadow-lg" />
                      </div>
                    </>
                  ) : (
                    <div className="relative w-full h-full bg-black" onClick={(e) => e.stopPropagation()}>
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                        onPlay={() => handleVideoPlay(item.id)}
                        onPause={() => handleVideoPause(item.id)}
                        onEnded={() => handleVideoPause(item.id)}
                      />
                      {!playingVideos.has(item.id) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                          <Play className="w-16 h-16 text-white opacity-80" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <CardContent className="p-2 sm:p-3 md:p-4">
                  <h3 className="font-semibold text-xs sm:text-base md:text-lg mb-0.5 sm:mb-1 md:mb-2 line-clamp-1">{item.title}</h3>
                  {item.description && (
                    <RichTextDisplay 
                      content={item.description} 
                      className="text-[10px] sm:text-xs md:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2 md:line-clamp-3 [&_p]:mb-0"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden [&>button]:hidden">
          {selectedItem && (
            <div className="relative w-full h-[90vh] flex flex-col">
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
                <h3 className="text-white font-semibold text-sm md:text-base truncate mr-4">{selectedItem.title}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedItem.media_type === 'image' && (
                    <>
                      <button onClick={handleZoomOut} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors" title="Zoom out">
                        <ZoomOut className="w-5 h-5" />
                      </button>
                      <span className="text-white text-xs font-mono min-w-[3rem] text-center">{Math.round(zoomLevel * 100)}%</span>
                      <button onClick={handleZoomIn} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors" title="Zoom in">
                        <ZoomIn className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <button onClick={closeLightbox} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div 
                className="flex-1 flex items-center justify-center overflow-hidden"
                onWheel={selectedItem.media_type === 'image' ? handleWheel : undefined}
                onPointerDown={selectedItem.media_type === 'image' ? handlePointerDown : undefined}
                onPointerMove={selectedItem.media_type === 'image' ? handlePointerMove : undefined}
                onPointerUp={selectedItem.media_type === 'image' ? handlePointerUp : undefined}
                style={{ cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
              >
                {selectedItem.media_type === 'image' ? (
                  <img
                    src={selectedItem.media_url}
                    alt={selectedItem.title}
                    className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                    }}
                    draggable={false}
                    onClick={() => { if (zoomLevel === 1) handleZoomIn(); }}
                  />
                ) : (
                  <video
                    src={selectedItem.media_url}
                    className="max-w-full max-h-full"
                    controls
                    autoPlay
                  />
                )}
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                  <RichTextDisplay 
                    content={selectedItem.description} 
                    className="text-white/90 text-xs md:text-sm [&_p]:mb-0"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
