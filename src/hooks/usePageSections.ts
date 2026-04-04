import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface PageBuilderSectionData {
  id: string;
  section_type: string;
  section_name: string;
  is_visible: boolean;
  settings: any;
  content: any;
  styles: any;
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

export function usePageSections(pageKey: string) {
  const [sections, setSections] = useState<PageBuilderSectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `page_sections_${pageKey}`;
    let hasCache = false;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setSections(parsed);
          setLoading(false);
          hasCache = true;
        }
      }
    } catch (error) {
      logger.warn('[usePageSections] Invalid cache', { pageKey, error });
    }

    async function loadSections() {
      const startedAt = performance.now();
      if (!hasCache) setLoading(true);

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
          if (pageRes.error) logger.error("[usePageSections] page query error", { pageKey, error: pageRes.error });
          if (!hasCache) setSections([]);
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
          logger.error("[usePageSections] sections query error", { pageKey, error: sectionsRes.error });
          if (!hasCache) setSections([]);
          return;
        }

        const freshSections = (sectionsRes.data as PageBuilderSectionData[]) || [];
        setSections(freshSections);
        localStorage.setItem(cacheKey, JSON.stringify(freshSections));
      } catch (e) {
        logger.error("[usePageSections] Error loading sections", { pageKey, error: e });
        if (!cancelled && !hasCache) setSections([]);
      } finally {
        if (!cancelled && !hasCache) setLoading(false);
        const ms = Math.round(performance.now() - startedAt);
        logger.info(`[usePageSections] loaded '${pageKey}' in ${ms}ms`);
      }
    }

    loadSections();
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  return { sections, loading };
}
