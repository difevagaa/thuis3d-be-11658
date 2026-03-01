import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  product_code?: string;
}

export function GlobalSearchBar({ className }: { className?: string }) {
  const { t } = useTranslation('products');
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query}%`;
        const { data } = await supabase
          .from("products")
          .select("id, name, price, product_code")
          .is("deleted_at", null)
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},product_code.ilike.${searchTerm}`)
          .limit(8);

        if (data && data.length > 0) {
          // Fetch first image per product
          const { data: imgs } = await supabase
            .from("product_images")
            .select("product_id, image_url")
            .in("product_id", data.map(p => p.id))
            .order("display_order");

          const imgMap: Record<string, string> = {};
          imgs?.forEach(img => {
            if (!imgMap[img.product_id]) imgMap[img.product_id] = img.image_url;
          });

          setResults(data.map(p => ({ ...p, image_url: imgMap[p.id] })));
          setIsOpen(true);
        } else {
          setResults([]);
          setIsOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (productId: string) => {
    setQuery("");
    setIsOpen(false);
    navigate(`/producto/${productId}`);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="pl-9 pr-8 h-9 text-sm"
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setIsOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{t('search.searching')}</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{t('search.noResults')}</div>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 transition-colors text-left"
                onClick={() => handleSelect(result.id)}
              >
                <div className="w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                  {result.image_url ? (
                    <img src={result.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Search className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.name}</p>
                  {result.product_code && (
                    <p className="text-xs text-muted-foreground">#{result.product_code}</p>
                  )}
                </div>
                <span className="text-sm font-bold text-primary flex-shrink-0">€{result.price.toFixed(2)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
