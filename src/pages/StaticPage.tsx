import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";

export default function StaticPage() {
  const { slug } = useParams();
  const { t } = useTranslation(["common", "errors"]);

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

  const { content: translatedPage } = useTranslatedContent(
    "pages",
    page?.id || "",
    ["title", "content"],
    page
  );

  const pageTitle = translatedPage.title ?? page?.title ?? "";
  const pageContent = translatedPage.content ?? page?.content ?? "";

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
          <h1 className="text-4xl font-bold mb-6">{pageTitle}</h1>
          <RichTextDisplay content={pageContent} className="prose-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
