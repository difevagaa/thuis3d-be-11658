import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface URLSelectorProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

interface URLOption {
  label: string;
  value: string;
  type: string;
}

export function URLSelector({ value, onChange, label = "URL", placeholder = "Selecciona o escribe una URL" }: URLSelectorProps) {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<URLOption[]>([]);
  const [customUrl, setCustomUrl] = useState(value || '');

  useEffect(() => {
    loadAvailableURLs();
  }, []);

  const loadAvailableURLs = async () => {
    const urlList: URLOption[] = [
      // Static pages
      { label: 'Inicio', value: '/', type: 'static' },
      { label: 'Productos', value: '/products', type: 'static' },
      { label: 'Cotizaciones', value: '/quotes', type: 'static' },
      { label: 'Tarjetas de regalo', value: '/gift-cards', type: 'static' },
      { label: 'Blog', value: '/blog', type: 'static' },
      { label: 'Galería', value: '/gallery', type: 'static' },
      { label: 'Mi cuenta', value: '/my-account', type: 'static' },
      { label: 'Carrito', value: '/cart', type: 'static' },
      { label: 'Contacto', value: '/contact', type: 'static' },
      { label: 'Sobre nosotros', value: '/about', type: 'static' },
      { label: 'FAQ', value: '/faq', type: 'static' },
      { label: 'Términos y condiciones', value: '/terms', type: 'static' },
      { label: 'Política de privacidad', value: '/privacy', type: 'static' },
    ];

    // Load dynamic pages from database
    try {
      const { data: pages } = await supabase
        .from('pages')
        .select('slug, title')
        .eq('is_published', true)
        .is('deleted_at', null);

      if (pages) {
        pages.forEach(page => {
          urlList.push({
            label: `Página: ${page.title}`,
            value: `/page/${page.slug}`,
            type: 'page'
          });
        });
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    }

    // Load categories
    try {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true);

      if (categories) {
        categories.forEach(category => {
          urlList.push({
            label: `Categoría: ${category.name}`,
            value: `/products?category=${category.id}`,
            type: 'category'
          });
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }

    // Load products (limit to recent 20 for performance)
    try {
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (products) {
        products.forEach(product => {
          urlList.push({
            label: `Producto: ${product.name}`,
            value: `/product/${product.id}`,
            type: 'product'
          });
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }

    // Load blog posts if exists
    try {
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, title')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (posts) {
        posts.forEach(post => {
          urlList.push({
            label: `Blog: ${post.title}`,
            value: `/blog/${post.slug}`,
            type: 'blog'
          });
        });
      }
    } catch (error) {
      // Blog table might not exist yet in all environments, this is expected
      logger.error('Blog posts table not available:', error);
    }

    setUrls(urlList);
  };

  const handleSelect = (selectedValue: string) => {
    setCustomUrl(selectedValue);
    onChange(selectedValue);
    setOpen(false);
  };

  const handleCustomChange = (newValue: string) => {
    setCustomUrl(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {(() => {
                const selectedUrl = urls.find((url) => url.value === value);
                return selectedUrl ? selectedUrl.label : "Seleccionar...";
              })()}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Buscar URL..." />
              <CommandList>
                <CommandEmpty>No se encontraron URLs.</CommandEmpty>
                <CommandGroup heading="Páginas estáticas">
                  {urls.filter(u => u.type === 'static').map((url) => (
                    <CommandItem
                      key={url.value}
                      value={url.value}
                      onSelect={() => handleSelect(url.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === url.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {url.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {urls.filter(u => u.type === 'page').length > 0 && (
                  <CommandGroup heading="Páginas personalizadas">
                    {urls.filter(u => u.type === 'page').map((url) => (
                      <CommandItem
                        key={url.value}
                        value={url.value}
                        onSelect={() => handleSelect(url.value)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === url.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {url.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {urls.filter(u => u.type === 'category').length > 0 && (
                  <CommandGroup heading="Categorías">
                    {urls.filter(u => u.type === 'category').map((url) => (
                      <CommandItem
                        key={url.value}
                        value={url.value}
                        onSelect={() => handleSelect(url.value)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === url.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {url.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {urls.filter(u => u.type === 'product').length > 0 && (
                  <CommandGroup heading="Productos">
                    {urls.filter(u => u.type === 'product').map((url) => (
                      <CommandItem
                        key={url.value}
                        value={url.value}
                        onSelect={() => handleSelect(url.value)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === url.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {url.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {urls.filter(u => u.type === 'blog').length > 0 && (
                  <CommandGroup heading="Blog">
                    {urls.filter(u => u.type === 'blog').map((url) => (
                      <CommandItem
                        key={url.value}
                        value={url.value}
                        onSelect={() => handleSelect(url.value)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === url.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {url.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          type="text"
          value={customUrl}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        {customUrl && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              window.open(customUrl, '_blank', 'noopener,noreferrer');
            }}
            title="Abrir en nueva pestaña"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Selecciona de la lista o escribe una URL personalizada
      </p>
    </div>
  );
}
