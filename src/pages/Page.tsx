import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextDisplay } from "@/components/RichTextDisplay";

export default function Page() {
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
        .is("deleted_at", null)
        .single();

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
    return <div className="container mx-auto p-6">Cargando...</div>;
  }

  if (!page) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold">Página no encontrada</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
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
