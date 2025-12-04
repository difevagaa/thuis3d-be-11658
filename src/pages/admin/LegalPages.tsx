import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { i18nToast } from "@/lib/i18nToast";
import { Input } from "@/components/ui/input";

export default function LegalPages() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState({
    privacy: { title: "", content: "" },
    cookies: { title: "", content: "" },
    terms: { title: "", content: "" },
    legal_notice: { title: "", content: "" }
  });

  useEffect(() => {
    loadPages();

    // Realtime subscription
    const channel = supabase
      .channel('legal-pages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'legal_pages'
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
        .from("legal_pages")
        .select("*");

      if (error) throw error;

      // Mantener valores por defecto y sobrescribir con datos de DB
      const pagesObj: any = {
        privacy: { title: "", content: "" },
        cookies: { title: "", content: "" },
        terms: { title: "", content: "" },
        legal_notice: { title: "", content: "" }
      };
      
      data?.forEach((page: any) => {
        pagesObj[page.page_type] = {
          title: page.title || "",
          content: page.content || ""
        };
      });

      setPages(pagesObj);
    } catch (error) {
      i18nToast.error("error.pageLoadFailed");
    } finally {
      setLoading(false);
    }
  };

  const savePage = async (pageType: string) => {
    const page = pages[pageType as keyof typeof pages];
    
    // Verificar que la página existe
    if (!page) {
      i18nToast.error("error.pageTypeInvalid");
      return;
    }
    
    if (!page.title?.trim()) {
      i18nToast.error("error.pageTitleRequired");
      return;
    }

    if (!page.content?.trim()) {
      i18nToast.error("error.pageContentRequired");
      return;
    }

    try {
      const { error } = await supabase
        .from("legal_pages")
        .upsert({
          page_type: pageType,
          title: page.title,
          content: page.content,
          is_published: true
        });

      if (error) throw error;
      i18nToast.success("success.pageSaved");
    } catch (error: any) {
      console.error("Error saving legal page:", error);
      toast.error("Error al guardar la página: " + (error.message || "Error desconocido"));
    }
  };

  const updatePage = (pageType: string, field: string, value: string) => {
    setPages({
      ...pages,
      [pageType]: {
        ...(pages[pageType as keyof typeof pages] || { title: "", content: "" }),
        [field]: value
      }
    });
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Páginas Legales</h1>
      <p className="text-muted-foreground mb-6">
        Estas páginas son requeridas para el cumplimiento de la normativa europea (RGPD)
      </p>

      <Tabs defaultValue="privacy" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
          <TabsTrigger value="cookies">Cookies</TabsTrigger>
          <TabsTrigger value="terms">Términos</TabsTrigger>
          <TabsTrigger value="legal_notice">Aviso Legal</TabsTrigger>
        </TabsList>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Política de Privacidad</CardTitle>
              <CardDescription>Compatible con RGPD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={pages.privacy.title}
                  onChange={(e) => updatePage("privacy", "title", e.target.value)}
                  placeholder="Política de Privacidad"
                />
              </div>
              <div>
                <Label>Contenido (HTML permitido)</Label>
                <Textarea
                  value={pages.privacy.content}
                  onChange={(e) => updatePage("privacy", "content", e.target.value)}
                  rows={15}
                  className="font-mono"
                  placeholder="<h2>Política de Privacidad</h2><p>Contenido...</p>"
                />
              </div>
              <Button onClick={() => savePage("privacy")}>Guardar Política de Privacidad</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cookies">
          <Card>
            <CardHeader>
              <CardTitle>Política de Cookies</CardTitle>
              <CardDescription>Información sobre el uso de cookies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={pages.cookies.title}
                  onChange={(e) => updatePage("cookies", "title", e.target.value)}
                  placeholder="Política de Cookies"
                />
              </div>
              <div>
                <Label>Contenido (HTML permitido)</Label>
                <Textarea
                  value={pages.cookies.content}
                  onChange={(e) => updatePage("cookies", "content", e.target.value)}
                  rows={15}
                  className="font-mono"
                  placeholder="<h2>Política de Cookies</h2><p>Contenido...</p>"
                />
              </div>
              <Button onClick={() => savePage("cookies")}>Guardar Política de Cookies</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle>Términos y Condiciones</CardTitle>
              <CardDescription>Contrato de uso del servicio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={pages.terms.title}
                  onChange={(e) => updatePage("terms", "title", e.target.value)}
                  placeholder="Términos y Condiciones"
                />
              </div>
              <div>
                <Label>Contenido (HTML permitido)</Label>
                <Textarea
                  value={pages.terms.content}
                  onChange={(e) => updatePage("terms", "content", e.target.value)}
                  rows={15}
                  className="font-mono"
                  placeholder="<h2>Términos y Condiciones</h2><p>Contenido...</p>"
                />
              </div>
              <Button onClick={() => savePage("terms")}>Guardar Términos y Condiciones</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal_notice">
          <Card>
            <CardHeader>
              <CardTitle>Aviso Legal</CardTitle>
              <CardDescription>Información fiscal y de registro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={pages.legal_notice.title}
                  onChange={(e) => updatePage("legal_notice", "title", e.target.value)}
                  placeholder="Aviso Legal"
                />
              </div>
              <div>
                <Label>Contenido (HTML permitido)</Label>
                <Textarea
                  value={pages.legal_notice.content}
                  onChange={(e) => updatePage("legal_notice", "content", e.target.value)}
                  rows={15}
                  className="font-mono"
                  placeholder="<h2>Aviso Legal</h2><p>Contenido...</p>"
                />
              </div>
              <Button onClick={() => savePage("legal_notice")}>Guardar Aviso Legal</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}