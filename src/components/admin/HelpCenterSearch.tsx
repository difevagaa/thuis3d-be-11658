import React, { useState, useEffect, useRef } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Search,
  Info,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  CheckCircle,
  ExternalLink,
  Video
} from 'lucide-react';
import { useHelpSearch } from '@/hooks/useHelpSearch';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HelpCenterSearchProps {
  section?: string;
  onHelpSelected?: (helpId: string) => void;
}

/**
 * Help Center Search Component
 * Provides a searchable command palette for contextual help
 */
export const HelpCenterSearch: React.FC<HelpCenterSearchProps> = ({
  section,
  onHelpSelected
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedHelp, setSelectedHelp] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const { results, loading, searchHelp, clearSearch } = useHelpSearch();
  const { trackHelpViewed, trackHelpClicked } = useContextualHelp(section || 'dashboard');

  // Search when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      const debounce = setTimeout(() => {
        searchHelp(query);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      clearSearch();
    }
  }, [query, searchHelp, clearSearch]);

  // Keyboard shortcut to open (Ctrl+K or Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const getIcon = (type: string) => {
    const iconClass = 'h-4 w-4';
    switch (type) {
      case 'warning':
        return <AlertTriangle className={cn(iconClass, 'text-yellow-600')} />;
      case 'info_box':
        return <Info className={cn(iconClass, 'text-blue-600')} />;
      case 'tutorial':
        return <BookOpen className={cn(iconClass, 'text-purple-600')} />;
      case 'best_practice':
        return <CheckCircle className={cn(iconClass, 'text-green-600')} />;
      case 'tip':
        return <Lightbulb className={cn(iconClass, 'text-amber-600')} />;
      default:
        return <HelpCircle className={cn(iconClass, 'text-gray-600')} />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tooltip: 'Ayuda',
      info_box: 'Info',
      tutorial: 'Tutorial',
      warning: 'Advertencia',
      best_practice: 'Mejor Práctica',
      example: 'Ejemplo',
      tip: 'Consejo',
      faq: 'FAQ'
    };
    return labels[type] || type;
  };

  const handleSelectHelp = (help: any) => {
    setSelectedHelp(help);
    setShowDetails(true);
    trackHelpViewed(help.id);
    trackHelpClicked(help.id);
    if (onHelpSelected) {
      onHelpSelected(help.id);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Buscar ayuda...</span>
        <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar en el centro de ayuda..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}
          
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>
              No se encontraron resultados para "{query}"
            </CommandEmpty>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Escribe al menos 2 caracteres para buscar
            </div>
          )}

          {!loading && results.length > 0 && (
            <CommandGroup heading={`${results.length} resultado${results.length !== 1 ? 's' : ''}`}>
              {results.map((help) => (
                <CommandItem
                  key={help.id}
                  onSelect={() => {
                    handleSelectHelp(help);
                    setOpen(false);
                  }}
                  className="flex items-start gap-3 py-3"
                >
                  {getIcon(help.help_type)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{help.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(help.help_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {help.content}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* Details Dialog - Accessible alternative to Popover */}
      {selectedHelp && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                {getIcon(selectedHelp.help_type)}
                <div className="flex-1 space-y-1">
                  <DialogTitle>{selectedHelp.title}</DialogTitle>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(selectedHelp.help_type)}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <DialogDescription className="text-sm text-gray-700 leading-relaxed whitespace-pre-line pt-3">
              {selectedHelp.content}
            </DialogDescription>

            {(selectedHelp.related_docs_url || selectedHelp.related_video_url) && (
              <div className="flex gap-2 pt-4">
                {selectedHelp.related_docs_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a href={selectedHelp.related_docs_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Documentación
                    </a>
                  </Button>
                )}
                {selectedHelp.related_video_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a href={selectedHelp.related_video_url} target="_blank" rel="noopener noreferrer">
                      <Video className="h-3 w-3 mr-1" />
                      Video Tutorial
                    </a>
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
