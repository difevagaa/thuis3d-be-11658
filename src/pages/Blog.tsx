import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock, BookOpen, ArrowRight } from "lucide-react";
import { logger } from "@/lib/logger";
import { calculateReadingTime, stripHtml } from "@/utils/textUtils";

export default function Blog() {
  const { t, i18n } = useTranslation('blog');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();

    // Subscribe to user_roles changes to reload posts with correct filtering
    const rolesChannel = supabase
      .channel('blog-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, () => {
        logger.log('User roles changed, reloading posts...');
        loadPosts();
      })
      .subscribe();

    // Subscribe to blog_post_roles changes to update visibility immediately
    const blogPostRolesChannel = supabase
      .channel('blog-post-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blog_post_roles'
      }, () => {
        logger.log('Blog post roles changed, reloading posts...');
        loadPosts();
      })
      .subscribe();

    // Subscribe to blog_posts changes
    const blogPostsChannel = supabase
      .channel('blog-posts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blog_posts'
      }, () => {
        logger.log('Blog posts changed, reloading...');
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(blogPostRolesChannel);
      supabase.removeChannel(blogPostsChannel);
    };
  }, []);

  const loadPosts = async () => {
    try {
      // Get current user and their roles
      const { data: { user } } = await supabase.auth.getUser();
      let userRoles: string[] = [];
      
      if (user) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        // Normalize roles to lowercase for case-insensitive comparison
        userRoles = rolesData?.map(r => String(r.role).toLowerCase()) || [];
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("published_at", { ascending: false });

      if (error) throw error;

      // Fetch roles for these posts separately to avoid join relationship issues
      const postIds = (data || []).map((p: any) => p.id);
      const rolesByPost: Record<string, string[]> = {};
      if (postIds.length > 0) {
        const { data: rolesData, error: rolesError } = await supabase
          .from("blog_post_roles")
          .select("post_id, role")
          .in("post_id", postIds);

        if (!rolesError && rolesData) {
          rolesData.forEach((r: any) => {
            const key = r.post_id as string;
            if (!rolesByPost[key]) rolesByPost[key] = [];
            rolesByPost[key].push(String(r.role).toLowerCase());
          });
        }
      }

      // Fetch categories for posts
      const categoryIds = [...new Set((data || []).filter((p: any) => p.category_id).map((p: any) => p.category_id))];
      const categoriesMap: Record<string, any> = {};
      if (categoryIds.length > 0) {
        const { data: categoriesData } = await supabase
          .from("blog_categories")
          .select("*")
          .in("id", categoryIds);
        
        categoriesData?.forEach((cat: any) => {
          categoriesMap[cat.id] = cat;
        });
      }

      // Filter posts based on roles and attach categories
      const filteredPosts = (data || [])
        .filter((post: any) => {
          const postRoles = rolesByPost[post.id] || [];
          const hasNoRoles = postRoles.length === 0;
          if (hasNoRoles) return true;

          // If post has roles but user is not logged in, don't show
          if (userRoles.length === 0) return false;

          // Check if any of user's roles matches any of the post roles (case-insensitive)
          return postRoles.some((role: string) => userRoles.includes(role));
        })
        .map((post: any) => ({
          ...post,
          category: post.category_id ? categoriesMap[post.category_id] : null
        }));
      
      setPosts(filteredPosts);
    } catch (error) {
      logger.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">
          {/* Header skeleton */}
          <div className="text-center mb-8 md:mb-12 space-y-4">
            <div className="h-10 w-64 bg-muted animate-pulse rounded mx-auto" />
            <div className="h-6 w-96 bg-muted animate-pulse rounded mx-auto" />
          </div>
          
          {/* Posts Grid skeleton */}
          <div className="grid gap-4 md:gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-full overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <CardHeader className="space-y-3 p-4">
                  <div className="h-4 w-20 bg-muted rounded-full" />
                  <div className="h-6 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            {t('subtitle')}
          </p>
        </div>
        
        {/* Posts Grid */}
        <div className="grid gap-4 md:gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-8 md:mb-12">
          {posts.map((post) => {
            const readingTime = calculateReadingTime(post.content || '');
            const plainExcerpt = stripHtml(post.excerpt || '');
            const publishDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
            
            return (
              <Link to={`/blog/${post.slug}`} key={post.id} className="group">
                <Card className="h-full overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border hover:border-primary/50 bg-card/50 backdrop-blur-sm">
                  {post.featured_image ? (
                    <div className="relative overflow-hidden h-40 md:h-48 lg:h-56">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      {/* Reading time badge on image */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white/90 text-xs bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        <span>{readingTime} min</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 md:h-48 lg:h-56 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-primary/40" />
                    </div>
                  )}
                  <CardHeader className="space-y-2 md:space-y-3 p-4 md:p-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {post.category && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-xs">
                          {post.category.name}
                        </Badge>
                      )}
                      <div className="flex items-center text-[10px] md:text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />
                        {publishDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <CardTitle className="text-base md:text-lg lg:text-xl group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </CardTitle>
                    {plainExcerpt && (
                      <CardDescription className="text-xs md:text-sm line-clamp-2 md:line-clamp-3 text-muted-foreground/80">
                        {plainExcerpt}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0 p-4 md:p-5 md:pt-0">
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-1.5 truncate">
                      <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                      <span className="truncate">{post.profiles?.full_name || t('author')}</span>
                    </p>
                    <span className="text-xs md:text-sm font-medium text-primary group-hover:gap-2 flex items-center gap-1 transition-all whitespace-nowrap">
                      {t('readMore')} 
                      <ArrowRight className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <Card className="text-center py-16 border-2 border-dashed bg-card/50">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-primary/60" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{t('empty.title')}</h3>
                  <p className="text-muted-foreground max-w-md">
                    {t('empty.description')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
