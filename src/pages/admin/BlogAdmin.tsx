import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { i18nToast } from "@/lib/i18nToast";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, 
  FileText, 
  Image as ImageIcon, 
  Users, 
  Plus, 
  Trash2, 
  Eye, 
  Calendar,
  Upload,
  X,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { logger } from "@/lib/logger";

export default function BlogAdmin() {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featured_image: "",
    category_id: "",
    is_published: false
  });
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes
    const blogChannel = supabase
      .channel('blog-admin-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blog_posts'
      }, loadData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blog_post_roles'
      }, loadData)
      .subscribe();

    // Subscribe to custom_roles changes to update role list dynamically
    const customRolesChannel = supabase
      .channel('blog-custom-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_roles'
      }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(blogChannel);
      supabase.removeChannel(customRolesChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [postsRes, categoriesRes, customRolesRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("id, title, slug, content, excerpt, featured_image, category_id, author_id, is_published, published_at, created_at, updated_at, deleted_at, blog_categories(name)")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("blog_categories").select("*"),
        supabase.from("custom_roles")
          .select("name, display_name")
          .order("display_name")
      ]);

      if (postsRes.error) {
        console.error("Error loading posts:", postsRes.error);
        throw postsRes.error;
      }

      setPosts(postsRes.data || []);
      setCategories(categoriesRes.data || []);
      
      // System roles from app_role enum
      const systemRoles = [
        { value: 'admin', label: 'Administradores' },
        { value: 'client', label: 'Clientes' },
        { value: 'moderator', label: 'Moderadores' }
      ];
      
      // Filter custom roles to exclude duplicates of system roles
      const systemRoleNames = systemRoles.map(r => r.value);
      const customRolesList = (customRolesRes.data || [])
        .filter(role => !systemRoleNames.includes(role.name))
        .map(role => ({
          value: role.name,
          label: role.display_name
        }));
      
      // Combine system roles with filtered custom roles
      setAvailableRoles([...systemRoles, ...customRolesList]);
    } catch (error) {
      logger.error("Error in loadData:", error);
      i18nToast.error("error.loadingFailed");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast.error(`Error al subir imagen: ${error.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    field: 'featured_image' | 'content',
    setPost?: (post: typeof newPost) => void,
    currentPost?: typeof newPost
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      const targetPost = currentPost || newPost;
      const targetSetter = setPost || setNewPost;
      
      if (field === 'featured_image') {
        targetSetter({ ...targetPost, featured_image: url });
      } else {
        const imgHtml = `\n<figure class="my-4"><img src="${url}" alt="Imagen del artículo" class="rounded-lg shadow-md max-w-full h-auto" /></figure>\n`;
        targetSetter({ ...targetPost, content: (targetPost.content || '') + imgHtml });
      }
      i18nToast.success("success.imageSaved");
    }
  };

  const createPost = async () => {
    try {
      // Validaciones básicas
      if (!newPost.title.trim()) {
        i18nToast.error("error.titleRequired");
        return;
      }

      // Generar/normalizar slug
      const base = (newPost.slug || newPost.title)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      if (!base) {
        i18nToast.error("error.pageSlugRequired");
        return;
      }

      // Asegurar slug único
      let finalSlug = base;
      let n = 2;
      // Intentar hasta encontrar uno libre (máx 20 intentos por seguridad)
      for (let i = 0; i < 20; i++) {
        const { data: existing, error: checkErr } = await supabase
          .from('blog_posts')
          .select('id')
          .eq('slug', finalSlug)
          .maybeSingle();
        if (checkErr || !existing) break;
        finalSlug = `${base}-${n++}`;
      }

      const content = (newPost.content || '').trim();
      if (!content) {
        i18nToast.error("error.contentRequired");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const insertObj = {
        ...newPost,
        slug: finalSlug,
        content,
        author_id: user?.id || null,
        category_id: newPost.category_id || null,
        published_at: newPost.is_published ? new Date().toISOString() : null
      };

      const { data: post, error } = await supabase
        .from('blog_posts')
        .insert([insertObj])
        .select()
        .single();

      if (error) throw error;

      if (selectedRoles.length > 0 && post) {
        const roleInserts = selectedRoles.map(role => ({ post_id: post.id, role }));
        const { error: rolesError } = await supabase
          .from('blog_post_roles')
          .insert(roleInserts);
        if (rolesError) throw rolesError;
      }

      i18nToast.success("success.articleCreated");
      setNewPost({
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        featured_image: "",
        category_id: "",
        is_published: false
      });
      setSelectedRoles([]);
      await loadData();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(`Error al crear artículo: ${error?.message || 'Desconocido'}`);
    }
  };

  const handleEditPost = async (post: any) => {
    setEditingPost(post);
    
    // Load current roles for this post
    const { data: postRoles } = await supabase
      .from("blog_post_roles")
      .select("role")
      .eq("post_id", post.id);
    
    setSelectedRoles(postRoles?.map(r => r.role) || []);
    setEditDialogOpen(true);
  };

  const updatePost = async () => {
    if (!editingPost) return;
    
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          title: editingPost.title,
          slug: editingPost.slug,
          content: editingPost.content,
          excerpt: editingPost.excerpt,
          featured_image: editingPost.featured_image,
          category_id: editingPost.category_id || null,
          is_published: editingPost.is_published,
          published_at: editingPost.is_published ? (editingPost.published_at || new Date().toISOString()) : null
        })
        .eq("id", editingPost.id);

      if (error) throw error;

      // Update roles
      // Delete existing roles
      await supabase
        .from("blog_post_roles")
        .delete()
        .eq("post_id", editingPost.id);

      // Insert new roles
      if (selectedRoles.length > 0) {
        const roleInserts = selectedRoles.map(role => ({
          post_id: editingPost.id,
          role: role
        }));

        const { error: rolesError } = await supabase
          .from("blog_post_roles")
          .insert(roleInserts);

        if (rolesError) throw rolesError;
      }

      i18nToast.success("success.articleUpdated");
      setEditDialogOpen(false);
      setEditingPost(null);
      setSelectedRoles([]);
      await loadData();
    } catch (error) {
      i18nToast.error("error.articleSaveFailed");
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      i18nToast.success("success.articleDeleted");
      await loadData();
    } catch (error) {
      i18nToast.error("error.articleDeleteFailed");
    }
  };

  // State for create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState("basic");
  const [activeEditTab, setActiveEditTab] = useState("basic");

  // Reset form when dialog closes
  const resetNewPostForm = () => {
    setNewPost({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      featured_image: "",
      category_id: "",
      is_published: false
    });
    setSelectedRoles([]);
    setActiveCreateTab("basic");
  };

  // Validation state
  const validatePost = (post: typeof newPost) => {
    const errors: string[] = [];
    if (!post.title.trim()) errors.push("El título es obligatorio");
    if (!post.content.trim()) errors.push("El contenido es obligatorio");
    return errors;
  };

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <Card className="animate-pulse">
          <CardHeader className="space-y-4">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-72 bg-muted rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reusable form component for create/edit
  const renderPostForm = (
    post: typeof newPost, 
    setPost: (post: typeof newPost) => void,
    isEdit: boolean = false
  ) => {
    const tabPrefix = isEdit ? "edit" : "create";
    const activeTab = isEdit ? activeEditTab : activeCreateTab;
    const setActiveTab = isEdit ? setActiveEditTab : setActiveCreateTab;
    
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Básico</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Contenido</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Multimedia</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Acceso</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Basic Info */}
        <TabsContent value="basic" className="space-y-6 mt-0">
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label htmlFor={`${tabPrefix}-title`} className="text-sm font-medium">
                Título del Artículo <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${tabPrefix}-title`}
                value={post.title}
                onChange={(e) => {
                  const title = e.target.value;
                  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                  setPost({ ...post, title, slug });
                }}
                placeholder="Ej: Cómo optimizar tus impresiones 3D"
                className="text-lg"
              />
              {!post.title.trim() && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> El título es obligatorio
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${tabPrefix}-slug`} className="text-sm font-medium">
                URL Amigable (Slug)
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">/blog/</span>
                <Input
                  id={`${tabPrefix}-slug`}
                  value={post.slug}
                  onChange={(e) => setPost({ ...post, slug: e.target.value })}
                  placeholder="url-del-articulo"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se genera automáticamente desde el título
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${tabPrefix}-category`} className="text-sm font-medium">
                Categoría
              </Label>
              <Select
                value={post.category_id}
                onValueChange={(value) => setPost({ ...post, category_id: value })}
              >
                <SelectTrigger id={`${tabPrefix}-category`}>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Estado de Publicación</Label>
                <p className="text-xs text-muted-foreground">
                  {post.is_published ? "El artículo será visible públicamente" : "El artículo se guardará como borrador"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={post.is_published ? "default" : "secondary"}>
                  {post.is_published ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Publicado</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" /> Borrador</>
                  )}
                </Badge>
                <Switch
                  checked={post.is_published}
                  onCheckedChange={(checked) => setPost({ ...post, is_published: checked })}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Content */}
        <TabsContent value="content" className="space-y-6 mt-0">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Extracto / Resumen
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Un breve resumen que aparecerá en las tarjetas de vista previa del blog
            </p>
            <div className="border rounded-lg overflow-hidden">
              <RichTextEditor
                value={post.excerpt}
                onChange={(value) => setPost({ ...post, excerpt: value })}
                placeholder="Escribe un breve extracto que capture la esencia del artículo..."
                className="min-h-[120px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Contenido del Artículo <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Usa el editor para dar formato, añadir imágenes, videos y más
            </p>
            <div className="border rounded-lg overflow-hidden">
              <RichTextEditor
                value={post.content}
                onChange={(value) => setPost({ ...post, content: value })}
                placeholder="Escribe el contenido completo de tu artículo aquí..."
                className="min-h-[350px]"
              />
            </div>
            {!post.content.trim() && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> El contenido es obligatorio
              </p>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Media */}
        <TabsContent value="media" className="space-y-6 mt-0">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Imagen Destacada</Label>
              <p className="text-xs text-muted-foreground">
                Esta imagen aparecerá como cabecera del artículo y en las previsualizaciones
              </p>
            </div>

            {post.featured_image ? (
              <div className="relative group">
                <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={post.featured_image}
                    alt="Imagen destacada"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-lg max-w-2xl">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPost({ ...post, featured_image: "" })}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <label className="block">
                <div className="aspect-video w-full max-w-2xl border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer bg-muted/30 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Arrastra una imagen o haz clic para subir</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG o WebP (máx. 10MB)</p>
                  </div>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadImage(file);
                    if (url) {
                      setPost({ ...post, featured_image: url });
                      i18nToast.success("success.featuredImageUploaded");
                    }
                  }}
                  disabled={uploadingImage}
                />
              </label>
            )}

            <div className="pt-6 border-t space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Imágenes para el Contenido</Label>
                <p className="text-xs text-muted-foreground">
                  Las imágenes se insertarán al final del contenido. Luego puedes moverlas dentro del editor.
                </p>
              </div>
              
              <label className="block">
                <div className="p-6 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer bg-muted/30 flex items-center justify-center gap-4">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Subir imágenes adicionales</p>
                    <p className="text-sm text-muted-foreground">Puedes seleccionar varias a la vez</p>
                  </div>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    for (const file of files) {
                      const url = await uploadImage(file);
                      if (url) {
                        const imgHtml = `\n<figure class="my-4"><img src="${url}" alt="Imagen del artículo" class="rounded-lg shadow-md max-w-full h-auto" /></figure>\n`;
                        setNewPost(prev => ({ ...prev, content: (prev.content || '') + imgHtml }));
                      }
                    }
                    toast.success(`${files.length} imagen(es) añadida(s) al contenido`);
                  }}
                  disabled={uploadingImage}
                />
              </label>

              {uploadingImage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Subiendo imagen...
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Access/Visibility */}
        <TabsContent value="access" className="space-y-6 mt-0">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Visibilidad por Roles</Label>
              <p className="text-xs text-muted-foreground">
                Restringe quién puede ver este artículo. Si no seleccionas ningún rol, será visible para todos.
              </p>
            </div>

            <div className="grid gap-3">
              {availableRoles.map((role) => (
                <div 
                  key={role.value} 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    selectedRoles.includes(role.value) 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedRoles.includes(role.value) ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Users className={`w-5 h-5 ${
                        selectedRoles.includes(role.value) ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{role.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.value === 'admin' && 'Usuarios administradores del sistema'}
                        {role.value === 'client' && 'Clientes registrados'}
                        {role.value === 'moderator' && 'Moderadores de contenido'}
                        {!['admin', 'client', 'moderator'].includes(role.value) && 'Rol personalizado'}
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    id={`${tabPrefix}-role-${role.value}`}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRoles([...selectedRoles, role.value]);
                      } else {
                        setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            {selectedRoles.length === 0 && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Este artículo será visible para todos los visitantes
                </p>
              </div>
            )}

            {selectedRoles.length > 0 && (
              <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Solo los usuarios con los roles seleccionados podrán ver este artículo
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Gestión del Blog
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea y administra los artículos de tu blog
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetNewPostForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow">
              <Plus className="w-4 h-4" /> Nuevo Artículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Crear Nuevo Artículo</DialogTitle>
              <DialogDescription>
                Completa la información para crear un nuevo artículo en tu blog
              </DialogDescription>
            </DialogHeader>
            
            {renderPostForm(newPost, setNewPost, false)}
            
            <DialogFooter className="mt-6 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetNewPostForm();
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={async () => {
                  await createPost();
                  setCreateDialogOpen(false);
                }}
                disabled={!newPost.title.trim() || !newPost.content.trim()}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Crear Artículo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.filter(p => p.is_published).length}</p>
                <p className="text-xs text-muted-foreground">Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.filter(p => !p.is_published).length}</p>
                <p className="text-xs text-muted-foreground">Borradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-xs text-muted-foreground">Categorías</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Artículos
          </CardTitle>
          <CardDescription>
            Lista de todos los artículos del blog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No hay artículos</h3>
                <p className="text-muted-foreground">Crea tu primer artículo para comenzar</p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} className="mt-2">
                <Plus className="w-4 h-4 mr-2" /> Crear Artículo
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Artículo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {post.featured_image ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <img
                                src={post.featured_image}
                                alt={post.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{post.title}</p>
                            <p className="text-xs text-muted-foreground truncate">/blog/{post.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.blog_categories?.name ? (
                          <Badge variant="outline">{post.blog_categories.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin categoría</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.is_published ? "default" : "secondary"}>
                          {post.is_published ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Publicado</>
                          ) : (
                            <><Eye className="w-3 h-3 mr-1" /> Borrador</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPost(post)}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePost(post.id)}
                            className="flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditingPost(null);
          setSelectedRoles([]);
          setActiveEditTab("basic");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar Artículo</DialogTitle>
            <DialogDescription>
              Modifica el contenido y configuración de tu artículo
            </DialogDescription>
          </DialogHeader>
          
          {editingPost && renderPostForm(
            editingPost, 
            (post) => setEditingPost(post),
            true
          )}
          
          <DialogFooter className="mt-6 gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={updatePost}
              disabled={!editingPost?.title?.trim() || !editingPost?.content?.trim()}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
