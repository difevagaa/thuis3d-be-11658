import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PageBuilderSectionData {
  id: string;
  section_type: string;
  section_name: string;
  is_visible: boolean;
  settings: any;
  content: any;
  styles: any;
  // Used for ordering in renderer
  display_order?: number;
}

function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number, label: string): Promise<T> {
  const promise = Promise.resolve(promiseLike);

  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms: ${label}`));
    }, ms);

    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Loads Page Builder sections for a given page key.
 * Root-cause fix: avoid dynamic import (chunk fetch can hang on some clients) and guarantee loading resolves.
 */
export function usePageSections(pageKey: string) {
  const [sections, setSections] = useState<PageBuilderSectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      const startedAt = performance.now();
      setLoading(true);

      try {
        const pageRes = await withTimeout(
          supabase
            .from("page_builder_pages")
            .select("id")
            .eq("page_key", pageKey)
            .eq("is_enabled", true)
            .maybeSingle(),
          15000,
          `page_builder_pages(${pageKey})`
        );

        if (cancelled) return;

        if (pageRes.error || !pageRes.data?.id) {
          if (pageRes.error) {
            console.error("[usePageSections] page query error:", pageRes.error);
          }
          setSections([]);
          return;
        }

        const sectionsRes = await withTimeout(
          supabase
            .from("page_builder_sections")
            .select("*")
            .eq("page_id", pageRes.data.id)
            .eq("is_visible", true)
            .order("display_order"),
          15000,
          `page_builder_sections(page_id=${pageRes.data.id})`
        );

        if (cancelled) return;

        if (sectionsRes.error) {
          console.error("[usePageSections] sections query error:", sectionsRes.error);
          setSections([]);
          return;
        }

        setSections((sectionsRes.data as PageBuilderSectionData[]) || []);
      } catch (e) {
        console.error("[usePageSections] Error loading sections:", e);
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          const ms = Math.round(performance.now() - startedAt);
          console.log(`[usePageSections] loaded '${pageKey}' in ${ms}ms`);
        }
      }
    }

    loadSections();
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  return { sections, loading };
}
