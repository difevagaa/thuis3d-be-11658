import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, RefreshCw, Check, Clock, AlertCircle, Save, Edit2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Entity type configuration with translatable fields
const ENTITY_TYPES = [
  { value: 'products', label: 'Productos', fields: ['name', 'description', 'specifications'], nameField: 'name' },
  { value: 'categories', label: 'Categorías', fields: ['name', 'description'], nameField: 'name' },
  { value: 'materials', label: 'Materiales', fields: ['name', 'description'], nameField: 'name' },
  { value: 'colors', label: 'Colores', fields: ['name'], nameField: 'name' },
  { value: 'blog_posts', label: 'Blog Posts', fields: ['title', 'excerpt', 'content'], nameField: 'title' },
  { value: 'pages', label: 'Páginas', fields: ['title', 'content', 'meta_description'], nameField: 'title' },
  { value: 'legal_pages', label: 'Páginas Legales', fields: ['title', 'content'], nameField: 'title' },
  { value: 'homepage_banners', label: 'Banners', fields: ['title', 'description'], nameField: 'title' },
  { value: 'gallery_items', label: 'Galería', fields: ['title', 'description'], nameField: 'title' },
  { value: 'footer_links', label: 'Enlaces Footer', fields: ['title'], nameField: 'title' },
];

const LANGUAGES = [
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'en', label: '🇬🇧 Inglés' },
  { value: 'nl', label: '🇳🇱 Neerlandés' },
];

interface TranslationData {
  id?: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  language: string;
  translated_text: string;
  is_auto_translated?: boolean;
}

interface EntityItem {
  id: string;
  [key: string]: any;
}

export default function TranslationManagement() {
  const { t } = useTranslation(['admin']);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  
  // Content management state
  const [selectedEntityType, setSelectedEntityType] = useState<string>('products');
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [translations, setTranslations] = useState<TranslationData[]>([]);
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});
  const [contentLoading, setContentLoading] = useState(false);
  const [savingTranslation, setSavingTranslation] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Suscripción en tiempo real a la cola
    const subscription = supabase
      .channel('translation_queue_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'translation_queue' },
        () => loadQueue()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load entities when entity type changes
  useEffect(() => {
    if (selectedEntityType) {
      loadEntities(selectedEntityType);
    }
  }, [selectedEntityType]);

  // Load translations when entity is selected
  useEffect(() => {
    if (selectedEntityId && selectedEntityType) {
      loadTranslationsForEntity(selectedEntityType, selectedEntityId);
    }
  }, [selectedEntityId, selectedEntityType]);

  const loadData = async () => {
    await Promise.all([loadStats(), loadQueue(), loadSettings()]);
  };

  const loadEntities = async (entityType: string) => {
    setContentLoading(true);
    setSelectedEntityId('');
    setTranslations([]);
    setEditedTranslations({});
    
    const config = ENTITY_TYPES.find(e => e.value === entityType);
    if (!config) {
      setContentLoading(false);
      return;
    }

    // Try with deleted_at filter first, then without if it fails
    const tryLoadEntities = async (withDeletedFilter: boolean): Promise<{data: any[] | null, error: any}> => {
      // Build query based on table type
      const tableName = entityType as 'products' | 'categories' | 'materials' | 'colors' | 'blog_posts' | 'pages' | 'legal_pages' | 'homepage_banners' | 'gallery_items' | 'footer_links';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(config.nameField, { ascending: true })
        .limit(100);
      
      return { data, error };
    };

    try {
      const { data, error } = await tryLoadEntities(true);
      if (error) throw error;
      // Ensure all items have an id field
      const validData = (data || []).filter((item: any) => item && item.id) as EntityItem[];
      setEntities(validData);
    } catch (error) {
      logger.error('Error loading entities:', error);
      setEntities([]);
    } finally {
      setContentLoading(false);
    }
  };

  const loadTranslationsForEntity = async (entityType: string, entityId: string) => {
    // Validate entityId before making the query
    if (!entityId || entityId.trim() === '') {
      logger.error('Invalid entityId provided to loadTranslationsForEntity');
      return;
    }
    
    setContentLoading(true);
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) throw error;
      setTranslations(data || []);
      setEditedTranslations({});
    } catch (error) {
      logger.error('Error loading translations:', error);
      setTranslations([]);
    } finally {
      setContentLoading(false);
    }
  };

  const getTranslationKey = (fieldName: string, language: string) => `${fieldName}_${language}`;

  const getTranslationValue = (fieldName: string, language: string): string => {
    const key = getTranslationKey(fieldName, language);
    if (editedTranslations[key] !== undefined) {
      return editedTranslations[key];
    }
    const translation = translations.find(
      t => t.field_name === fieldName && t.language === language
    );
    return translation?.translated_text || '';
  };

  const getOriginalValue = (fieldName: string): string => {
    const entity = entities.find(e => e.id === selectedEntityId);
    return entity?.[fieldName] || '';
  };

  const handleTranslationChange = (fieldName: string, language: string, value: string) => {
    const key = getTranslationKey(fieldName, language);
    setEditedTranslations(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = (fieldName: string, language: string): boolean => {
    const key = getTranslationKey(fieldName, language);
    return editedTranslations[key] !== undefined;
  };

  const saveTranslation = async (fieldName: string, language: string) => {
    const key = getTranslationKey(fieldName, language);
    const value = editedTranslations[key];
    
    if (value === undefined) return;

    setSavingTranslation(key);
    try {
      const existingTranslation = translations.find(
        t => t.field_name === fieldName && t.language === language
      );

      if (existingTranslation) {
        // Update existing translation
        const { error } = await supabase
          .from('translations')
          .update({ 
            translated_text: value,
            is_auto_translated: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTranslation.id);

        if (error) throw error;
      } else {
        // Insert new translation
        const { error } = await supabase
          .from('translations')
          .insert({
            entity_type: selectedEntityType,
            entity_id: selectedEntityId,
            field_name: fieldName,
            language: language,
            translated_text: value,
            is_auto_translated: false
          });

        if (error) throw error;
      }

      toast({
        title: 'Traducción guardada',
        description: `La traducción para ${fieldName} (${language.toUpperCase()}) se ha guardado correctamente`,
      });

      // Reload translations and clear edited state for this field
      await loadTranslationsForEntity(selectedEntityType, selectedEntityId);
      await loadStats();
    } catch (error) {
      logger.error('Error saving translation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la traducción',
        variant: 'destructive',
      });
    } finally {
      setSavingTranslation(null);
    }
  };

  const cancelEdit = (fieldName: string, language: string) => {
    const key = getTranslationKey(fieldName, language);
    setEditedTranslations(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const loadStats = async () => {
    try {
      const { data: translations } = await supabase
        .from('translations')
        .select('language, entity_type');

      if (translations) {
        const statsByLang: any = {
          es: translations.filter(t => t.language === 'es').length,
          en: translations.filter(t => t.language === 'en').length,
          nl: translations.filter(t => t.language === 'nl').length,
        };

        const statsByType: any = {};
        translations.forEach(t => {
          statsByType[t.entity_type] = (statsByType[t.entity_type] || 0) + 1;
        });

        setStats({ byLanguage: statsByLang, byType: statsByType, total: translations.length });
      }
    } catch (error) {
      logger.error('Error loading stats:', error);
    }
  };

  const loadQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('translation_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setQueue(data || []);
    } catch (error) {
      logger.error('Error loading queue:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('translation_settings')
        .select('*');

      if (data) {
        const settingsObj: any = {};
        data.forEach(setting => {
          settingsObj[setting.setting_key] = setting.setting_value;
        });
        setSettings(settingsObj);
      }
    } catch (error) {
      logger.error('Error loading settings:', error);
    }
  };

  const enqueueAllContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('enqueue_all_translatable_content');
      
      if (error) throw error;

      toast({
        title: 'Contenido encolado',
        description: `${data || 0} elementos agregados a la cola de traducción`,
      });

      await loadData();
    } catch (error) {
      logger.error('Error enqueuing content:', error);
      toast({
        title: 'Error',
        description: 'No se pudo encolar el contenido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-translate');

      if (error) throw error;

      toast({
        title: 'Procesamiento completado',
        description: `${data?.processed || 0} traducciones procesadas, ${data?.errors || 0} errores`,
      });

      await loadData();
    } catch (error) {
      logger.error('Error processing queue:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar la cola de traducción',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('translation_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);

      if (error) throw error;

      toast({
        title: 'Configuración actualizada',
        description: 'Los cambios se han guardado correctamente',
      });

      await loadSettings();
    } catch (error) {
      logger.error('Error updating setting:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: { variant: 'secondary', icon: Clock, text: 'Pendiente' },
      processing: { variant: 'default', icon: Loader2, text: 'Procesando' },
      completed: { variant: 'success', icon: Check, text: 'Completado' },
      failed: { variant: 'destructive', icon: AlertCircle, text: 'Fallido' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            {t('translationManagement')}
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las traducciones automáticas de contenido en español, inglés y neerlandés
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={enqueueAllContent} disabled={loading} variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Encolando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Encolar Todo
              </>
            )}
          </Button>
          <Button onClick={processQueue} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Procesar Cola
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="queue">
            Cola de Traducción
            {queue.filter(q => q.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {queue.filter(q => q.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="content">Contenido</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total de Traducciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stats?.total || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Por Idioma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>🇪🇸 Español:</span>
                  <span className="font-bold">{stats?.byLanguage?.es || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>🇬🇧 Inglés:</span>
                  <span className="font-bold">{stats?.byLanguage?.en || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>🇳🇱 Neerlandés:</span>
                  <span className="font-bold">{stats?.byLanguage?.nl || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cola Pendiente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {queue.filter(q => q.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Traducciones por Tipo de Contenido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {stats?.byType && Object.entries(stats.byType).map(([type, count]: any) => (
                  <div key={type} className="flex justify-between border-b pb-2">
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Cola de Traducción</CardTitle>
              <CardDescription>
                Elementos pendientes de traducción automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Idiomas Destino</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="capitalize">
                        {item.entity_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{item.field_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.target_languages.map((lang: string) => (
                            <Badge key={lang} variant="outline">
                              {lang.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {queue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay elementos en la cola
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Contenido Traducido</CardTitle>
              <CardDescription>
                Edita manualmente las traducciones de contenido en español, inglés y neerlandés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Entity type and entity selection */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Contenido</Label>
                  <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Elemento a Traducir</Label>
                  <Select 
                    value={selectedEntityId} 
                    onValueChange={setSelectedEntityId}
                    disabled={entities.length === 0 || contentLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={contentLoading ? "Cargando..." : "Selecciona un elemento"} />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((entity) => {
                        const config = ENTITY_TYPES.find(e => e.value === selectedEntityType);
                        // More robust fallback chain: configured nameField -> 'name' -> 'title' -> entity id
                        const nameField = config?.nameField || 'name';
                        const displayName = entity[nameField] || entity.name || entity.title || `ID: ${entity.id}`;
                        return (
                          <SelectItem key={entity.id} value={entity.id}>
                            {displayName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Translations editor */}
              {selectedEntityId && (
                <div className="space-y-6">
                  {contentLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Cargando traducciones...</span>
                    </div>
                  ) : (
                    <>
                      {ENTITY_TYPES.find(e => e.value === selectedEntityType)?.fields.map((fieldName) => (
                        <Card key={fieldName} className="border-dashed">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg capitalize flex items-center gap-2">
                              <Edit2 className="h-4 w-4" />
                              {fieldName.replace('_', ' ')}
                            </CardTitle>
                            <CardDescription>
                              Original (ES): {getOriginalValue(fieldName)?.substring(0, 100)}{getOriginalValue(fieldName)?.length > 100 ? '...' : ''}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4">
                              {LANGUAGES.map((lang) => (
                                <div key={lang.value} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                      {lang.label}
                                      {translations.find(t => t.field_name === fieldName && t.language === lang.value)?.is_auto_translated && (
                                        <Badge variant="outline" className="text-xs">Auto</Badge>
                                      )}
                                    </Label>
                                    {hasChanges(fieldName, lang.value) && (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => cancelEdit(fieldName, lang.value)}
                                          disabled={savingTranslation === getTranslationKey(fieldName, lang.value)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => saveTranslation(fieldName, lang.value)}
                                          disabled={savingTranslation === getTranslationKey(fieldName, lang.value)}
                                        >
                                          {savingTranslation === getTranslationKey(fieldName, lang.value) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <>
                                              <Save className="h-4 w-4 mr-1" />
                                              Guardar
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <Textarea
                                    value={getTranslationValue(fieldName, lang.value)}
                                    onChange={(e) => handleTranslationChange(fieldName, lang.value, e.target.value)}
                                    placeholder={`Traducción en ${lang.label}...`}
                                    className={`min-h-[80px] ${lang.value === 'es' ? 'bg-muted/50' : ''}`}
                                    rows={fieldName === 'content' ? 6 : 3}
                                  />
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              )}

              {!selectedEntityId && entities.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Selecciona un elemento para ver y editar sus traducciones
                </div>
              )}

              {entities.length === 0 && !contentLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay elementos disponibles para este tipo de contenido
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Traducción</CardTitle>
              <CardDescription>
                Ajusta cómo funciona el sistema de traducción automática
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-translate">Auto-traducir nuevo contenido</Label>
                  <p className="text-sm text-muted-foreground">
                    Traduce automáticamente cuando se crea o edita contenido
                  </p>
                </div>
                <Switch
                  id="auto-translate"
                  checked={settings.auto_translate_new_content === true}
                  onCheckedChange={(checked) => 
                    updateSetting('auto_translate_new_content', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-detect">Detección automática de idioma</Label>
                  <p className="text-sm text-muted-foreground">
                    Detecta el idioma del usuario por país/navegador
                  </p>
                </div>
                <Switch
                  id="auto-detect"
                  checked={settings.auto_detect_language === true}
                  onCheckedChange={(checked) => 
                    updateSetting('auto_detect_language', checked)
                  }
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Idioma por defecto</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Idioma que se mostrará si no se puede detectar: <strong>Español (ES)</strong>
                </p>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Idiomas habilitados</h3>
                <div className="flex gap-2">
                  <Badge>🇪🇸 Español</Badge>
                  <Badge>🇬🇧 English</Badge>
                  <Badge>🇳🇱 Nederlands</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
