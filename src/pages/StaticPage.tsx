import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextDisplay } from "@/components/RichTextDisplay";

export default function StaticPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      setPage(data);
    } catch (error) {
      console.error("Error loading page:", error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <h1 className="text-3xl font-bold mb-4">Página no encontrada</h1>
            <p className="text-muted-foreground">La página que buscas no existe o no está publicada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card>
        <CardContent className="p-8">
          <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
          <RichTextDisplay 
            content={page.content} 
            className="prose-lg"
          />
        </CardContent>
      </Card>
    </div>
  );
}
