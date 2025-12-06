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
  EyeOff,
  Monitor,
  Tablet,
  Smartphone,
  HelpCircle
} from "lucide-react";
import { PageBuilderSidebar } from "@/components/page-builder/PageBuilderSidebar";
import { PageBuilderCanvas } from "@/components/page-builder/PageBuilderCanvas";
import { PageBuilderSettings } from "@/components/page-builder/PageBuilderSettings";
import { SectionEditor } from "@/components/page-builder/SectionEditor";
import { PageBuilderHelp } from "@/components/page-builder/PageBuilderHelp";

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
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);

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
      // First, get the page to know which page we're editing
      const { data: pageData } = await supabase
        .from('page_builder_pages')
        .select('page_key')
        .eq('id', pageId)
        .single();

      if (!pageData) return;

      // For the home page, load existing content from homepage tables
      if (pageData.page_key === 'home') {
        const adaptedSections = await loadHomepageContent(pageId);
        setSections(adaptedSections);
      } else {
        // For other pages, load from page_builder_sections
        const { data, error } = await supabase
          .from('page_builder_sections')
          .select('*')
          .eq('page_id', pageId)
          .order('display_order');

        if (error) throw error;
        setSections(data || []);
      }
    } catch (error) {
      logger.error('Error loading sections:', error);
      toast.error('Error al cargar las secciones');
    }
  }, []);

  // Load and adapt homepage content from existing tables
  const loadHomepageContent = async (pageId: string) => {
    const adaptedSections: SectionData[] = [];
    let order = 0;

    try {
      // Load homepage banners
      const { data: banners } = await supabase
        .from('homepage_banners')
        .select('*, banner_images(*)')
        .eq('is_active', true)
        .order('display_order');

      if (banners) {
        banners.forEach((banner) => {
          adaptedSections.push({
            id: `banner-${banner.id}`,
            page_id: pageId,
            section_type: 'hero',
            section_name: banner.title || 'Banner',
            display_order: order++,
            is_visible: banner.is_active || true,
            settings: {
              fullWidth: banner.display_style === 'fullscreen',
              height: banner.height || '500px',
              sourceTable: 'homepage_banners',
              sourceId: banner.id
            },
            content: {
              title: banner.title,
              subtitle: banner.description,
              backgroundImage: banner.image_url,
              buttonText: banner.link_url ? 'Ver más' : '',
              buttonUrl: banner.link_url
            },
            styles: {
              backgroundColor: 'transparent',
              textColor: banner.title_color || '#ffffff',
              padding: 80,
              textAlign: 'center'
            }
          });
        });
      }

      // Load homepage sections
      const { data: sections } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (sections) {
        sections.forEach((section) => {
          adaptedSections.push({
            id: `section-${section.id}`,
            page_id: pageId,
            section_type: section.image_url ? 'banner' : 'text',
            section_name: section.title || 'Sección',
            display_order: order++,
            is_visible: section.is_active || true,
            settings: {
              fullWidth: true,
              sourceTable: 'homepage_sections',
              sourceId: section.id
            },
            content: {
              title: section.title,
              subtitle: section.subtitle,
              text: section.description,
              backgroundImage: section.image_url
            },
            styles: {
              backgroundColor: section.background_color || 'transparent',
              textColor: section.image_url ? '#ffffff' : 'inherit',
              padding: 60,
              textAlign: 'center'
            }
          });
        });
      }

      // Load homepage features
      const { data: features } = await supabase
        .from('homepage_features')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (features && features.length > 0) {
        adaptedSections.push({
          id: `features-group`,
          page_id: pageId,
          section_type: 'features',
          section_name: 'Características',
          display_order: order++,
          is_visible: true,
          settings: {
            fullWidth: true,
            sourceTable: 'homepage_features',
            sourceId: null // null indicates this is a collection of features
          },
          content: {
            title: 'Por Qué Elegirnos',
            features: features.map((f) => ({
              id: f.id,
              icon: f.icon_name,
              title: f.title,
              description: f.description
            }))
          },
          styles: {
            backgroundColor: 'transparent',
            padding: 60
          }
        });
      }

      // Load homepage quick access cards
      const { data: cards } = await supabase
        .from('homepage_quick_access_cards')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (cards && cards.length > 0) {
        cards.forEach((card) => {
          adaptedSections.push({
            id: `card-${card.id}`,
            page_id: pageId,
            section_type: 'cta',
            section_name: card.title || 'Tarjeta de acceso rápido',
            display_order: order++,
            is_visible: card.is_active || true,
            settings: {
              fullWidth: false,
              sourceTable: 'homepage_quick_access_cards',
              sourceId: card.id
            },
            content: {
              title: card.title,
              description: card.description,
              buttonText: card.button_text,
              buttonUrl: card.button_url
            },
            styles: {
              backgroundColor: 'transparent',
              padding: 40
            }
          });
        });
      }

    } catch (error) {
      logger.error('Error loading homepage content:', error);
    }

    return adaptedSections.sort((a, b) => a.display_order - b.display_order);
  };

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (selectedPage) {
      loadSections(selectedPage.id);
      setSearchParams({ page: selectedPage.page_key });
    }
  }, [selectedPage, loadSections, setSearchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) handleSaveAll();
      }
      // Ctrl/Cmd + Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, historyIndex, history]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save state to history for undo/redo
  const saveToHistory = useCallback((newSections: SectionData[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newSections)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setSections(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      toast.info('Cambio deshecho');
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setSections(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      toast.info('Cambio rehecho');
    }
  }, [historyIndex, history]);

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

      const newSections = [...sections, data];
      setSections(newSections);
      saveToHistory(newSections);
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
      // Find the section to determine its source
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      // If section has sourceTable, update the original table
      if (section.settings?.sourceTable) {
        const sourceTable = section.settings.sourceTable;
        const sourceId = section.settings.sourceId;
        
        if (sourceTable === 'homepage_banners' && sourceId) {
          // Banner update data
          const updateData: Partial<{
            title: string;
            description: string;
            image_url: string;
            link_url: string;
            title_color: string;
            text_color: string;
            height: string;
            display_style: string;
            is_active: boolean;
          }> = {};

          if (updates.content) {
            if (updates.content.title !== undefined) updateData.title = updates.content.title;
            if (updates.content.subtitle !== undefined) updateData.description = updates.content.subtitle;
            if (updates.content.backgroundImage !== undefined) updateData.image_url = updates.content.backgroundImage;
            if (updates.content.buttonUrl !== undefined) updateData.link_url = updates.content.buttonUrl;
          }
          if (updates.styles) {
            if (updates.styles.textColor !== undefined) {
              updateData.title_color = updates.styles.textColor;
              updateData.text_color = updates.styles.textColor;
            }
          }
          if (updates.settings) {
            if (updates.settings.height !== undefined) updateData.height = updates.settings.height;
            if (updates.settings.fullWidth !== undefined) {
              updateData.display_style = updates.settings.fullWidth ? 'fullscreen' : 'card';
            }
          }
          if (updates.is_visible !== undefined) updateData.is_active = updates.is_visible;

          if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
              .from('homepage_banners')
              .update(updateData)
              .eq('id', sourceId);
            
            if (error) throw error;
          }
        } 
        else if (sourceTable === 'homepage_sections' && sourceId) {
          // Section update data
          const updateData: Partial<{
            title: string;
            subtitle: string;
            description: string;
            image_url: string;
            background_color: string;
            is_active: boolean;
          }> = {};

          if (updates.content) {
            if (updates.content.title !== undefined) updateData.title = updates.content.title;
            if (updates.content.subtitle !== undefined) updateData.subtitle = updates.content.subtitle;
            if (updates.content.text !== undefined) updateData.description = updates.content.text;
            if (updates.content.backgroundImage !== undefined) updateData.image_url = updates.content.backgroundImage;
          }
          if (updates.styles?.backgroundColor !== undefined) {
            updateData.background_color = updates.styles.backgroundColor;
          }
          if (updates.is_visible !== undefined) updateData.is_active = updates.is_visible;

          if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
              .from('homepage_sections')
              .update(updateData)
              .eq('id', sourceId);
            
            if (error) throw error;
          }
        }
        else if (sourceTable === 'homepage_quick_access_cards' && sourceId) {
          // Card update data
          const updateData: Partial<{
            title: string;
            description: string;
            button_text: string;
            button_url: string;
            is_active: boolean;
          }> = {};

          if (updates.content) {
            if (updates.content.title !== undefined) updateData.title = updates.content.title;
            if (updates.content.description !== undefined) updateData.description = updates.content.description;
            if (updates.content.buttonText !== undefined) updateData.button_text = updates.content.buttonText;
            if (updates.content.buttonUrl !== undefined) updateData.button_url = updates.content.buttonUrl;
          }
          if (updates.is_visible !== undefined) updateData.is_active = updates.is_visible;

          if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
              .from('homepage_quick_access_cards')
              .update(updateData)
              .eq('id', sourceId);
            
            if (error) throw error;
          }
        }
        else if (sourceTable === 'homepage_features') {
          // Features is a collection, only update the section title (content.title)
          // Individual feature items are edited in the Features admin page
          // We only update local state here for the title change
          if (updates.content?.title) {
            toast.info('El título de la sección se actualiza solo localmente. Las características individuales se editan en la página de administración de Características.');
          }
        }
      } else {
        // Update page_builder_sections for new sections
        const { error } = await supabase
          .from('page_builder_sections')
          .update(updates)
          .eq('id', sectionId);

        if (error) throw error;
      }

      // Update local state
      const newSections = sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      );
      
      setSections(newSections);
      saveToHistory(newSections);
      
      if (selectedSection?.id === sectionId) {
        setSelectedSection(prev => prev ? { ...prev, ...updates } : null);
      }
      
      setHasChanges(true);
      toast.success('Sección actualizada');
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

      const newSections = sections.filter(s => s.id !== sectionId);
      setSections(newSections);
      saveToHistory(newSections);
      
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

      const newSections = [...sections, data];
      setSections(newSections);
      saveToHistory(newSections);
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

      const newSections = reorderedSections.map((s, i) => ({ ...s, display_order: i }));
      setSections(newSections);
      saveToHistory(newSections);
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="ml-2"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
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
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewportMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewportMode('desktop')}
              className="h-7 px-2"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={viewportMode === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewportMode('tablet')}
              className="h-7 px-2"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={viewportMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewportMode('mobile')}
              className="h-7 px-2"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Rehacer (Ctrl+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-1" />
            Vista previa
          </Button>
          <Button 
            size="sm" 
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            title="Guardar (Ctrl+S)"
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
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
          {selectedPage ? (
            <div className="flex-1 flex items-start justify-center overflow-auto p-4">
              <div
                className="transition-all duration-300 bg-background shadow-xl"
                style={{
                  width: viewportMode === 'desktop' ? '100%' : viewportMode === 'tablet' ? '768px' : '375px',
                  maxWidth: '100%',
                  minHeight: viewportMode === 'desktop' ? '100%' : '600px'
                }}
              >
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
              </div>
            </div>
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

      {/* Help Dialog */}
      <PageBuilderHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
