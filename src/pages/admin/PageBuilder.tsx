import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import {
  Layout,
  Home,
  ShoppingBag,
  FileText,
  Gift,
  BookOpen,
  Image as ImageIcon,
  User,
  Plus,
  Save,
  Eye,
  Undo,
  Redo,
  Settings,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Edit2,
  Copy,
  EyeOff
} from "lucide-react";
import { PageBuilderSidebar } from "@/components/page-builder/PageBuilderSidebar";
import { PageBuilderCanvas } from "@/components/page-builder/PageBuilderCanvas";
import { PageBuilderSettings } from "@/components/page-builder/PageBuilderSettings";
import { SectionEditor } from "@/components/page-builder/SectionEditor";

interface PageData {
  id: string;
  page_key: string;
  page_name: string;
  description: string | null;
  is_enabled: boolean;
}

interface SectionData {
  id: string;
  page_id: string;
  section_type: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
  settings: any;
  content: any;
  styles: any;
}

export default function PageBuilder() {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageData | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const pageIcons: Record<string, React.ReactNode> = {
    'home': <Home className="h-4 w-4" />,
    'products': <ShoppingBag className="h-4 w-4" />,
    'quotes': <FileText className="h-4 w-4" />,
    'gift-cards': <Gift className="h-4 w-4" />,
    'blog': <BookOpen className="h-4 w-4" />,
    'gallery': <ImageIcon className="h-4 w-4" />,
    'my-account': <User className="h-4 w-4" />
  };

  const loadPages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('page_builder_pages')
        .select('*')
        .order('page_key');

      if (error) throw error;
      setPages(data || []);

      // Select page from URL or first page
      const pageKey = searchParams.get('page');
      if (pageKey && data) {
        const page = data.find(p => p.page_key === pageKey);
        if (page) {
          setSelectedPage(page);
        } else if (data.length > 0) {
          setSelectedPage(data[0]);
        }
      } else if (data && data.length > 0) {
        setSelectedPage(data[0]);
      }
    } catch (error) {
      logger.error('Error loading pages:', error);
      toast.error('Error al cargar las páginas');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const loadSections = useCallback(async (pageId: string) => {
    try {
      const { data, error } = await supabase
        .from('page_builder_sections')
        .select('*')
        .eq('page_id', pageId)
        .order('display_order');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      logger.error('Error loading sections:', error);
      toast.error('Error al cargar las secciones');
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (selectedPage) {
      loadSections(selectedPage.id);
      setSearchParams({ page: selectedPage.page_key });
    }
  }, [selectedPage, loadSections, setSearchParams]);

  const handlePageSelect = (page: PageData) => {
    if (hasChanges) {
      if (!confirm('Tienes cambios sin guardar. ¿Deseas continuar?')) {
        return;
      }
    }
    setSelectedPage(page);
    setSelectedSection(null);
    setHasChanges(false);
  };

  const handleSectionSelect = (section: SectionData) => {
    setSelectedSection(section);
  };

  const handleAddSection = async (templateConfig: any) => {
    if (!selectedPage) return;

    try {
      const newSection = {
        page_id: selectedPage.id,
        section_type: templateConfig.type,
        section_name: templateConfig.name || `Nueva sección ${sections.length + 1}`,
        display_order: sections.length,
        is_visible: true,
        settings: templateConfig.settings || {},
        content: templateConfig.content || {},
        styles: templateConfig.styles || {}
      };

      const { data, error } = await supabase
        .from('page_builder_sections')
        .insert(newSection)
        .select()
        .single();

      if (error) throw error;

      setSections(prev => [...prev, data]);
      setSelectedSection(data);
      setHasChanges(true);
      toast.success('Sección añadida');
    } catch (error) {
      logger.error('Error adding section:', error);
      toast.error('Error al añadir la sección');
    }
  };

  const handleUpdateSection = async (sectionId: string, updates: Partial<SectionData>) => {
    try {
      const { error } = await supabase
        .from('page_builder_sections')
        .update(updates)
        .eq('id', sectionId);

      if (error) throw error;

      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      ));
      
      if (selectedSection?.id === sectionId) {
        setSelectedSection(prev => prev ? { ...prev, ...updates } : null);
      }
      
      setHasChanges(true);
    } catch (error) {
      logger.error('Error updating section:', error);
      toast.error('Error al actualizar la sección');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta sección?')) return;

    try {
      const { error } = await supabase
        .from('page_builder_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      setSections(prev => prev.filter(s => s.id !== sectionId));
      if (selectedSection?.id === sectionId) {
        setSelectedSection(null);
      }
      setHasChanges(true);
      toast.success('Sección eliminada');
    } catch (error) {
      logger.error('Error deleting section:', error);
      toast.error('Error al eliminar la sección');
    }
  };

  const handleDuplicateSection = async (section: SectionData) => {
    try {
      const newSection = {
        page_id: section.page_id,
        section_type: section.section_type,
        section_name: `${section.section_name} (copia)`,
        display_order: sections.length,
        is_visible: section.is_visible,
        settings: section.settings,
        content: section.content,
        styles: section.styles
      };

      const { data, error } = await supabase
        .from('page_builder_sections')
        .insert(newSection)
        .select()
        .single();

      if (error) throw error;

      setSections(prev => [...prev, data]);
      setHasChanges(true);
      toast.success('Sección duplicada');
    } catch (error) {
      logger.error('Error duplicating section:', error);
      toast.error('Error al duplicar la sección');
    }
  };

  const handleReorderSections = async (reorderedSections: SectionData[]) => {
    const updates = reorderedSections.map((section, index) => ({
      id: section.id,
      display_order: index
    }));

    try {
      for (const update of updates) {
        await supabase
          .from('page_builder_sections')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      setSections(reorderedSections.map((s, i) => ({ ...s, display_order: i })));
      setHasChanges(true);
    } catch (error) {
      logger.error('Error reordering sections:', error);
      toast.error('Error al reordenar las secciones');
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // All changes are saved immediately, so just refresh
      await loadSections(selectedPage!.id);
      setHasChanges(false);
      toast.success('Cambios guardados correctamente');
    } catch (error) {
      logger.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (selectedPage) {
      const previewUrls: Record<string, string> = {
        'home': '/',
        'products': '/productos',
        'quotes': '/cotizaciones',
        'gift-cards': '/tarjetas-regalo',
        'blog': '/blog',
        'gallery': '/galeria',
        'my-account': '/mi-cuenta'
      };
      window.open(previewUrls[selectedPage.page_key] || '/', '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
            Admin
          </Button>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <span className="font-semibold">Editor de Páginas</span>
          </div>
          {selectedPage && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {pageIcons[selectedPage.page_key]}
              {selectedPage.page_name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              Cambios sin guardar
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-1" />
            Vista previa
          </Button>
          <Button 
            size="sm" 
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Pages */}
        <div className="w-64 border-r bg-muted/30 flex flex-col">
          <div className="p-3 border-b">
            <h3 className="font-medium text-sm text-muted-foreground">PÁGINAS</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => handlePageSelect(page)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    selectedPage?.id === page.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  {pageIcons[page.page_key]}
                  <span className="flex-1">{page.page_name}</span>
                  {!page.is_enabled && (
                    <EyeOff className="h-3 w-3 opacity-50" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedPage ? (
            <PageBuilderCanvas
              sections={sections}
              selectedSection={selectedSection}
              onSelectSection={handleSectionSelect}
              onUpdateSection={handleUpdateSection}
              onDeleteSection={handleDeleteSection}
              onDuplicateSection={handleDuplicateSection}
              onReorderSections={handleReorderSections}
              previewMode={previewMode}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Selecciona una página para editar</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Section Settings & Templates */}
        <PageBuilderSidebar
          selectedSection={selectedSection}
          onAddSection={handleAddSection}
          onUpdateSection={handleUpdateSection}
        />
      </div>
    </div>
  );
}
