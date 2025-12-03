import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, ArrowLeft, Clock, Share2, BookOpen } from "lucide-react";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { toast } from "sonner";
import { i18nToast } from "@/lib/i18nToast";
import { logger } from "@/lib/logger";
import { calculateReadingTime } from "@/utils/textUtils";
import { useDataWithRecovery } from "@/hooks/useDataWithRecovery";

export default function BlogPost() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation('blogPost');
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<any>(null);
  const hasPostRef = useRef(false);
  
  // Hook para contenido traducido del post
  const { content: translatedPost, loading: translatingPost } = useTranslatedContent(
    'blog_posts',
    post?.id || '',
    ['title', 'excerpt', 'content'],
    post
  );

  const loadPost = useCallback(async () => {
    // Only show loading state if we don't have a post yet (prevents flickering on background reloads)
    if (!hasPostRef.current) {
      setLoading(true);
    }
    
    try {
      // Obtener usuario y sus roles
      const { data: { user } } = await supabase.auth.getUser();
      let userRoles: string[] = [];
      if (user) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        userRoles = rolesData?.map(r => String(r.role).toLowerCase()) || [];
      }

      // Cargar post por slug sin joins que rompen la consulta
      const { data: postData, error: postError } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .is("deleted_at", null)
        .single();

      if (postError) throw postError;
      if (!postData) {
        setPost(null);
        return;
      }

      // Verificar visibilidad por roles del post
      const { data: postRolesData } = await supabase
        .from("blog_post_roles")
        .select("role")
        .eq("post_id", postData.id);

      const assignedRoles = (postRolesData || []).map(r => String(r.role).toLowerCase());
      if (assignedRoles.length > 0) {
        const allowed = userRoles.some(r => assignedRoles.includes(r));
        if (!allowed) {
          setPost(null);
          return;
        }
      }

      // Load category separately if exists
      if (postData.category_id) {
        const { data: categoryData } = await supabase
          .from("blog_categories")
          .select("*")
          .eq("id", postData.category_id)
          .single();
        setCategory(categoryData);
      }

      setPost(postData);
      if (postData) {
        hasPostRef.current = true;
      }
    } catch (error) {
      logger.error("Error loading post:", error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Use data recovery hook - loadPost already includes slug in useCallback deps
  useDataWithRecovery(loadPost, {
    timeout: 15000,
    maxRetries: 3
  });

  const handleShare = async () => {
    const url = window.location.href;
    const title = translatedPost.title || post?.title || '';
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        // User cancelled or error
        logger.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      i18nToast.success("success.linkCopied");
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Back button skeleton */}
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            
            {/* Hero image skeleton */}
            <div className="aspect-[21/9] w-full bg-muted animate-pulse rounded-2xl" />
            
            {/* Title skeleton */}
            <div className="space-y-4">
              <div className="h-10 w-3/4 bg-muted animate-pulse rounded" />
              <div className="flex gap-4">
                <div className="h-6 w-24 bg-muted animate-pulse rounded-full" />
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: `${90 - i * 5}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">{t('notFound')}</h1>
            <p className="text-muted-foreground">
              El artículo que buscas no existe o no tienes acceso a él.
            </p>
          </div>
          <Link to="/blog">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('backToBlog')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const readingTime = calculateReadingTime(translatedPost.content || post.content || '');
  const publishDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12 md:pb-20">
      {/* Hero Section */}
      {post.featured_image && (
        <div className="relative w-full h-[40vh] md:h-[50vh] lg:h-[60vh] overflow-hidden">
          <img
            src={post.featured_image}
            alt={`3D printing blog article: ${translatedPost.title || post.title}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className={`max-w-4xl mx-auto ${post.featured_image ? '-mt-32 md:-mt-40 relative z-10' : 'pt-8 md:pt-12'}`}>
          {/* Back Button */}
          <Link 
            to="/blog" 
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t('backToBlog')}
          </Link>

          {/* Main Content Card */}
          <Card className="overflow-hidden shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-6 md:p-10 lg:p-12">
              {/* Category and Meta */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {category && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 px-3 py-1.5">
                    {category.name}
                  </Badge>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {publishDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{readingTime} min</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 text-foreground">
                {translatedPost.title || post.title}
              </h1>
              
              {/* Author and Share */}
              <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{post.profiles?.full_name || t('publishedBy', { ns: 'blog' })}</p>
                    <p className="text-xs text-muted-foreground">Autor</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </Button>
              </div>

              <Separator className="mb-8" />
              
              {/* Excerpt */}
              {translatedPost.excerpt && (
                <div className="mb-8">
                  <div className="relative pl-6 border-l-4 border-primary/50 bg-primary/5 rounded-r-lg py-4 pr-4">
                    <RichTextDisplay 
                      content={translatedPost.excerpt} 
                      className="text-lg md:text-xl text-muted-foreground italic [&_p]:mb-0" 
                    />
                  </div>
                </div>
              )}
              
              {/* Content */}
              <article className="blog-content">
                <RichTextDisplay 
                  content={translatedPost.content || post.content} 
                  className="prose-lg md:prose-xl prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary prose-img:rounded-xl prose-img:shadow-lg" 
                />
              </article>

              {/* Tags/Category Footer */}
              {category && (
                <>
                  <Separator className="my-8" />
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Categoría:</span>
                    <Badge variant="secondary" className="px-3 py-1">
                      {category.name}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Footer Navigation */}
          <div className="mt-8 md:mt-12 flex justify-center">
            <Link to="/blog">
              <Button variant="outline" size="lg" className="gap-2 shadow-md hover:shadow-lg transition-shadow">
                <ArrowLeft className="w-4 h-4" />
                {t('viewMore')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
