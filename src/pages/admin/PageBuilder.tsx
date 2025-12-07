import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import * as pageBuilderUtils from "@/lib/pageBuilderUtils";
import * as sectionTesting from "@/lib/sectionTesting";
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
  ChevronLeft,
  ChevronDown,
  Edit2,
  Copy,
  EyeOff,
  Monitor,
  Tablet,
  Smartphone,
  HelpCircle,
  Download,
  Upload,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Clipboard,
  TestTube,
  CheckCircle,
  Shield,
  Cookie,
  Scale,
  Truck,
  RotateCcw,
  Info,
  Mail,
  HelpCircleIcon
} from "lucide-react";
import { PageBuilderSidebar } from "@/components/page-builder/PageBuilderSidebar";
import { PageBuilderCanvas } from "@/components/page-builder/PageBuilderCanvas";
import { PageBuilderSettings } from "@/components/page-builder/PageBuilderSettings";
import { SectionEditor } from "@/components/page-builder/SectionEditor";
import { PageBuilderHelp } from "@/components/page-builder/PageBuilderHelp";

export interface PageData {
  id: string;
  page_key: string;
  page_name: string;
  description: string | null;
  is_enabled: boolean;
}

export interface SectionData {
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
  
  // New states for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<boolean | 'all'>('all');
  const [testing, setTesting] = useState(false);
  
  // Sidebar visibility state with auto-hide
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Section editor dialog state
  const [editingSection, setEditingSection] = useState<SectionData | null>(null);

  // Test all sections
  const handleRunTests = async () => {
    if (!selectedPage) {
      toast.error('Selecciona una página primero');
      return;
    }

    setTesting(true);
    toast.info('Ejecutando pruebas comprehensivas...');

    try {
      const results = await sectionTesting.runComprehensiveTests(selectedPage.id);
      const report = sectionTesting.generateTestReport(results);
      
      console.log(report);
      
      // Count totals
      let totalPassed = 0;
      let totalTested = 0;
      let hasErrors = false;
      
      Object.values(results).forEach(result => {
        totalPassed += result.passed;
        totalTested += result.tested;
        if (!result.success) hasErrors = true;
      });
      
      if (hasErrors) {
        toast.error(`Pruebas completadas: ${totalPassed}/${totalTested} pasaron. Ver consola para detalles.`);
      } else {
        toast.success(`✅ Todas las pruebas pasaron: ${totalPassed}/${totalTested}`);
      }
    } catch (error) {
      logger.error('Error running tests:', error);
      toast.error('Error ejecutando pruebas');
    } finally {
      setTesting(false);
    }
  };

  // Test current section
  const handleTestCurrentSection = async () => {
    if (!selectedSection) {
      toast.error('Selecciona una sección primero');
      return;
    }

    setTesting(true);
    
    try {
      const success = await sectionTesting.testSectionSave(selectedSection);
      if (success) {
        toast.success('✅ Sección validada correctamente');
      }
    } catch (error) {
      logger.error('Error testing section:', error);
      toast.error('Error validando sección');
    } finally {
      setTesting(false);
    }
  };

  // Auto-hide sidebar logic
  useEffect(() => {
    const resetTimer = () => {
      setLastActivity(Date.now());
      setSidebarVisible(true);
      
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      
      autoHideTimerRef.current = setTimeout(() => {
        setSidebarVisible(false);
      }, 5000); // Hide after 5 seconds
    };
    
    // Reset timer on any activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    
    // Initial timer
    resetTimer();
    
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);
  
  // Manual toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
    setLastActivity(Date.now());
  }, []);

  const pageIcons: Record<string, React.ReactNode> = {
    'home': <Home className="h-4 w-4" />,
    'products': <ShoppingBag className="h-4 w-4" />,
    'quotes': <FileText className="h-4 w-4" />,
    'gift-cards': <Gift className="h-4 w-4" />,
    'blog': <BookOpen className="h-4 w-4" />,
    'gallery': <ImageIcon className="h-4 w-4" />,
    'my-account': <User className="h-4 w-4" />,
    // Legal pages
    'privacy-policy': <Shield className="h-4 w-4" />,
    'terms-of-service': <Scale className="h-4 w-4" />,
    'cookies-policy': <Cookie className="h-4 w-4" />,
    'legal-notice': <FileText className="h-4 w-4" />,
    'shipping-policy': <Truck className="h-4 w-4" />,
    'return-policy': <RotateCcw className="h-4 w-4" />,
    // Additional pages
    'about-us': <Info className="h-4 w-4" />,
    'contact': <Mail className="h-4 w-4" />,
    'faq': <HelpCircleIcon className="h-4 w-4" />
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
      // Load from page_builder_sections for all pages
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

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      // All changes are saved immediately, so just refresh
      if (selectedPage) {
        await loadSections(selectedPage.id);
      }
      setHasChanges(false);
      toast.success('Cambios guardados correctamente');
    } catch (error) {
      logger.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [selectedPage, loadSections]);

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
  }, [hasChanges, handleSaveAll, handleUndo, handleRedo]);

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
  
  const handleEditSection = (section: SectionData) => {
    setEditingSection(section);
  };
  
  const handleCloseEditor = () => {
    setEditingSection(null);
  };
  
  const handleSaveSection = async (updates: Partial<SectionData>) => {
    if (!editingSection) return;
    await handleUpdateSection(editingSection.id, updates);
    setEditingSection(null);
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
      // Update page_builder_sections directly
      const { error } = await supabase
        .from('page_builder_sections')
        .update(updates)
        .eq('id', sectionId);

      if (error) throw error;

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
      const duplicated = pageBuilderUtils.duplicateSection(section);
      delete duplicated.id; // Let Supabase generate new ID
      
      const { data, error } = await supabase
        .from('page_builder_sections')
        .insert(duplicated)
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

  const handleCopySection = async (section: SectionData) => {
    const success = await pageBuilderUtils.copySectionToClipboard(section);
    if (success) {
      toast.success('Sección copiada al portapapeles');
    } else {
      toast.error('Error al copiar la sección');
    }
  };

  const handlePasteSection = async () => {
    if (!selectedPage) return;
    
    const pasted = await pageBuilderUtils.pasteSectionFromClipboard();
    if (!pasted) {
      toast.error('No hay sección válida en el portapapeles');
      return;
    }

    try {
      const newSection = {
        ...pasted,
        page_id: selectedPage.id,
        display_order: sections.length
      };
      delete newSection.id;

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
      toast.success('Sección pegada');
    } catch (error) {
      logger.error('Error pasting section:', error);
      toast.error('Error al pegar la sección');
    }
  };

  const handleExportSection = (section: SectionData) => {
    pageBuilderUtils.exportSectionAsJSON(section);
    toast.success('Sección exportada');
  };

  const handleImportSection = async (file: File) => {
    if (!selectedPage) return;
    
    const imported = await pageBuilderUtils.importSectionFromJSON(file);
    if (!imported) {
      toast.error('Archivo JSON inválido');
      return;
    }

    try {
      const newSection = {
        ...imported,
        page_id: selectedPage.id,
        display_order: sections.length
      };
      delete newSection.id;

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
      toast.success('Sección importada');
    } catch (error) {
      logger.error('Error importing section:', error);
      toast.error('Error al importar la sección');
    }
  };

  const handleMoveSectionUp = async (sectionId: string) => {
    const reordered = pageBuilderUtils.moveSectionUp(sections, sectionId);
    await handleReorderSections(reordered);
  };

  const handleMoveSectionDown = async (sectionId: string) => {
    const reordered = pageBuilderUtils.moveSectionDown(sections, sectionId);
    await handleReorderSections(reordered);
  };

  // Get filtered sections based on search and filters
  const getFilteredSections = (): SectionData[] => {
    let filtered = sections;
    
    // Apply search
    if (searchQuery) {
      filtered = pageBuilderUtils.searchSections(filtered, searchQuery);
    }
    
    // Apply type filter
    if (filterType && filterType !== 'all') {
      filtered = pageBuilderUtils.filterSectionsByType(filtered, filterType);
    }
    
    // Apply visibility filter
    if (filterVisibility !== 'all') {
      filtered = pageBuilderUtils.filterSectionsByVisibility(filtered, filterVisibility);
    }
    
    return filtered;
  };

  const filteredSections = getFilteredSections();
  const sectionTypes = pageBuilderUtils.getUniqueSectionTypes(sections);
  const sectionCount = pageBuilderUtils.getSectionCountByType(sections);


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
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-background -m-6 w-[calc(100%+3rem)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b bg-card gap-2 h-12">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="h-8 px-2">
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="hidden sm:inline ml-1">Admin</span>
          </Button>
          <div className="flex items-center gap-1">
            <Layout className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium text-sm hidden md:inline">Editor de Páginas</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(true)}
            className="h-7 w-7 p-0"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          {selectedPage && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {pageIcons[selectedPage.page_key]}
              <span className="ml-1">{selectedPage.page_name}</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-0.5 border rounded p-0.5">
            <Button
              variant={viewportMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewportMode('desktop')}
              className="h-6 w-6 p-0"
            >
              <Monitor className="h-3 w-3" />
            </Button>
            <Button
              variant={viewportMode === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewportMode('tablet')}
              className="h-6 w-6 p-0"
            >
              <Tablet className="h-3 w-3" />
            </Button>
            <Button
              variant={viewportMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewportMode('mobile')}
              className="h-6 w-6 p-0"
            >
              <Smartphone className="h-3 w-3" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex <= 0} className="h-7 w-7 p-0">
            <Undo className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="h-7 w-7 p-0">
            <Redo className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handlePreview} className="h-7 px-2">
            <Eye className="h-3 w-3" />
            <span className="hidden lg:inline ml-1 text-xs">Vista previa</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleTestCurrentSection} disabled={testing || !selectedSection} className="h-7 px-2">
            <CheckCircle className="h-3 w-3" />
            <span className="hidden xl:inline ml-1 text-xs">Validar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRunTests} disabled={testing || !selectedPage} className="h-7 px-2">
            <TestTube className="h-3 w-3" />
            <span className="hidden xl:inline ml-1 text-xs">{testing ? 'Probando...' : 'Probar Todo'}</span>
          </Button>
          <Button size="sm" onClick={handleSaveAll} disabled={saving || !hasChanges} className="h-7 px-2">
            <Save className="h-3 w-3" />
            <span className="hidden sm:inline ml-1 text-xs">{saving ? 'Guardando...' : 'Guardar'}</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar - Pages */}
        <div className="w-40 lg:w-48 flex-shrink-0 border-r bg-muted/30 flex flex-col min-h-0">
          <div className="p-2 border-b flex-shrink-0">
            <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Páginas</h3>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-1.5 space-y-0.5">
              {pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => handlePageSelect(page)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                    selectedPage?.id === page.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="flex-shrink-0">{pageIcons[page.page_key]}</span>
                  <span className="truncate">{page.page_name}</span>
                  {!page.is_enabled && <EyeOff className="h-3 w-3 opacity-50 flex-shrink-0 ml-auto" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-muted/30">
          {selectedPage ? (
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex items-start justify-center p-3 min-h-full">
                <div
                  className="transition-all duration-300 bg-background shadow-lg rounded"
                  style={{
                    width: viewportMode === 'desktop' ? '100%' : viewportMode === 'tablet' ? '768px' : '375px',
                    maxWidth: '100%',
                    minHeight: '500px'
                  }}
                >
                  <PageBuilderCanvas
                    sections={sections}
                    selectedSection={selectedSection}
                    onSelectSection={handleSectionSelect}
                    onEditSection={handleEditSection}
                    onUpdateSection={handleUpdateSection}
                    onDeleteSection={handleDeleteSection}
                    onDuplicateSection={handleDuplicateSection}
                    onReorderSections={handleReorderSections}
                    previewMode={previewMode}
                  />
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Selecciona una página para editar
            </div>
          )}
        </div>

        {/* Right Sidebar - No auto-hide */}
        <div className="relative w-56 lg:w-64 flex-shrink-0">
          {/* Toggle Button - Always visible */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={`absolute top-2 z-50 transition-all duration-300 ${
              sidebarVisible ? '-left-10' : 'left-2'
            }`}
            title={sidebarVisible ? 'Ocultar panel' : 'Mostrar panel'}
          >
            {sidebarVisible ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Sidebar */}
          <div
            className={`absolute inset-0 transition-all duration-300 ease-in-out ${
              sidebarVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
            }`}
          >
            <PageBuilderSidebar
              selectedSection={selectedSection}
              onAddSection={handleAddSection}
              onUpdateSection={handleUpdateSection}
              onEditSection={handleEditSection}
            />
          </div>
        </div>
      </div>

      {/* Help Dialog */}
      <PageBuilderHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
      />
      
      {/* Section Editor Dialog */}
      {editingSection && (
        <SectionEditor
          section={editingSection}
          onUpdate={handleSaveSection}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
}
