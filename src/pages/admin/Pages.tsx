import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { i18nToast, toast } from "@/lib/i18nToast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

export default function Pages() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [pageForm, setPageForm] = useState({
    title: "",
    slug: "",
    content: "",
    meta_description: "",
    is_published: true
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadPages();

    // Realtime subscription
    const channel = supabase
      .channel('pages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pages'
      }, () => {
        loadPages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPages = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      i18nToast.error("error.pageLoadFailed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (page: any) => {
    setEditingPage(page);
    setPageForm({
      title: page.title,
      slug: page.slug,
      content: page.content,
      meta_description: page.meta_description || "",
      is_published: page.is_published
    });
  };

  const handleSave = async () => {
    if (!pageForm.title.trim()) {
      i18nToast.error("error.pageTitleRequired");
      return;
    }

    if (!pageForm.slug.trim()) {
      const generated = pageForm.title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setPageForm((p) => ({ ...p, slug: generated }));
    }

    if (!pageForm.content.trim()) {
      i18nToast.error("error.pageContentRequired");
      return;
    }

    try {
      if (editingPage) {
        // Update
        const { error } = await supabase
          .from("pages")
          .update(pageForm)
          .eq("id", editingPage.id);

        if (error) {
          if (error.code === '23505') {
            i18nToast.error("error.pageSlugExists");
            return;
          }
          throw error;
        }
        i18nToast.success("success.pageUpdated");
      } else {
        // Create
        const { error } = await supabase
          .from("pages")
          .insert([pageForm]);

        if (error) {
          if (error.code === '23505') {
            i18nToast.error("error.pageSlugExists");
            return;
          }
          throw error;
        }
        i18nToast.success("success.pageCreated");
      }

      setEditingPage(null);
      setPageForm({
        title: "",
        slug: "",
        content: "",
        meta_description: "",
        is_published: true
      });
      await loadPages();
    } catch (error: any) {
      logger.error("Error saving page:", error);
      toast.error("Error al guardar página: " + (error.message || "Error desconocido"));
    }
  };

  const uploadImage = async (file: File) => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `pages/${fileName}`;

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      const imgHtml = `\n<figure class="my-4"><img src="${url}" alt="Imagen de página" class="rounded-lg shadow-md max-w-full h-auto" /></figure>\n`;
      setPageForm({ 
        ...pageForm, 
        content: (pageForm.content || '') + imgHtml
      });
      i18nToast.success("success.imageSaved");
    }
  };

  const deletePage = async (id: string) => {
    try {
      const { error } = await supabase
        .from("pages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      i18nToast.success("success.pageDeleted");
      loadPages();
    } catch (error) {
      i18nToast.error("error.pageDeleteFailed");
    }
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Gestión de Páginas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Páginas Estáticas</CardTitle>
          <CardDescription>Crea y gestiona páginas como Sobre Nosotros, FAQ, etc.</CardDescription>
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPage(null);
                setPageForm({
                  title: "",
                  slug: "",
                  content: "",
                  meta_description: "",
                  is_published: true
                });
              }}>
                Crear Página
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPage ? 'Editar' : 'Nueva'} Página</DialogTitle>
                <DialogDescription>
                  {editingPage ? 'Edita' : 'Crea'} una página estática
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={pageForm.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                      setPageForm({ ...pageForm, title, slug });
                    }}
                  />
                </div>
                <div>
                  <Label>Slug (URL)</Label>
                  <Input
                    value={pageForm.slug}
                    onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Meta Descripción</Label>
                  <Input
                    value={pageForm.meta_description}
                    onChange={(e) => setPageForm({ ...pageForm, meta_description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contenido</Label>
                  <RichTextEditor
                    value={pageForm.content}
                    onChange={(value) => setPageForm({ ...pageForm, content: value })}
                    placeholder="Escribe el contenido de la página..."
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Publicada</Label>
                  <Switch
                    checked={pageForm.is_published}
                    onCheckedChange={(checked) => setPageForm({ ...pageForm, is_published: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave}>
                  {editingPage ? 'Actualizar' : 'Crear'} Página
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {pages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No hay páginas creadas
              </div>
            ) : (
              pages.map((page) => (
                <div key={page.id} className="border rounded-lg p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{page.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">/page/{page.slug}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-muted">
                      {page.is_published ? "Publicada" : "Borrador"}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Creada: {new Date(page.created_at).toLocaleDateString()}
                  </p>
                  
                  <div className="flex gap-2 pt-2 border-t flex-wrap">
                    {page.is_published && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                      >
                        Ver Página
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handleEdit(page)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Página</DialogTitle>
                          <DialogDescription>Modifica el contenido de la página</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Título</Label>
                            <Input
                              value={pageForm.title}
                              onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Slug (URL)</Label>
                            <Input
                              value={pageForm.slug}
                              onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Meta Descripción</Label>
                            <Input
                              value={pageForm.meta_description}
                              onChange={(e) => setPageForm({ ...pageForm, meta_description: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Contenido</Label>
                            <RichTextEditor
                              value={pageForm.content}
                              onChange={(value) => setPageForm({ ...pageForm, content: value })}
                              placeholder="Escribe el contenido de la página..."
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>Publicada</Label>
                            <Switch
                              checked={pageForm.is_published}
                              onCheckedChange={(checked) => setPageForm({ ...pageForm, is_published: checked })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSave}>Actualizar Página</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs px-2"
                      onClick={() => deletePage(page.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>{page.title}</TableCell>
                    <TableCell className="font-mono text-sm">/page/{page.slug}</TableCell>
                    <TableCell>{page.is_published ? "Publicada" : "Borrador"}</TableCell>
                    <TableCell>{new Date(page.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {page.is_published && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                          >
                            Ver Página
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(page)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Editar Página</DialogTitle>
                              <DialogDescription>Modifica el contenido de la página</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Título</Label>
                                <Input
                                  value={pageForm.title}
                                  onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Slug (URL)</Label>
                                <Input
                                  value={pageForm.slug}
                                  onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Meta Descripción</Label>
                                <Input
                                  value={pageForm.meta_description}
                                  onChange={(e) => setPageForm({ ...pageForm, meta_description: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Contenido</Label>
                                <RichTextEditor
                                  value={pageForm.content}
                                  onChange={(value) => setPageForm({ ...pageForm, content: value })}
                                  placeholder="Escribe el contenido de la página..."
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Publicada</Label>
                                <Switch
                                  checked={pageForm.is_published}
                                  onCheckedChange={(checked) => setPageForm({ ...pageForm, is_published: checked })}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleSave}>Actualizar Página</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePage(page.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}