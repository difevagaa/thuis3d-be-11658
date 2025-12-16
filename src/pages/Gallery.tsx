import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import { RichTextDisplay } from "@/components/RichTextDisplay";

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
      toast.error(t('errorLoading', { defaultValue: 'Error al cargar la galería' }));
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
              <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                <div className="relative aspect-[4/3] sm:aspect-square bg-muted">
                  {item.media_type === 'image' ? (
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={item.media_url}
                        className="w-full h-full object-contain"
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
    </>
  );
}
