import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import DOMPurify from "dompurify";

export default function LegalPage() {
  const { type } = useParams();
  const { t } = useTranslation(["common", "errors"]);
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("legal_pages")
        .select("*")
        .eq("page_type", type)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      setPage(data);
    } catch (error) {
      console.error("Error loading legal page:", error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">{t("common:loading")}</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <h1 className="text-3xl font-bold mb-4">{t("errors:pageNotFound")}</h1>
            <p className="text-muted-foreground">{t("errors:pageNotFoundMessage")}</p>
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
          <div
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}