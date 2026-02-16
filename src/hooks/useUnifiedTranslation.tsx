import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationOptions {
  // Entity type for dynamic content (e.g., 'product', 'category', 'blog_post')
  entityType?: string;
  // Entity ID for fetching specific translations
  entityId?: string;
  // Fields to fetch translations for
  fields?: string[];
  // Original content to use as fallback
  originalContent?: Record<string, string>;
}

interface UnifiedTranslationResult {
  // Standard i18next t function for static translations
  t: (key: string, options?: Record<string, unknown>) => string;
  
  // Get translated dynamic content
  getDynamic: (field: string, fallback?: string) => string;
  
  // Current language
  language: string;
  
  // Change language
  changeLanguage: (lng: string) => Promise<void>;
  
  // Loading state for dynamic translations
  isLoading: boolean;
  
  // Check if a static translation exists
  exists: (key: string) => boolean;
  
  // Get all dynamic translations for current entity
  dynamicContent: Record<string, string>;
}

// Cache for dynamic translations to avoid repeated fetches
const translationCache = new Map<string, Record<string, string>>();

export function useUnifiedTranslation(options: TranslationOptions = {}): UnifiedTranslationResult {
  const { t: staticT, i18n } = useTranslation();
  const { entityType, entityId, fields = [], originalContent = {} } = options;
  
  const [dynamicContent, setDynamicContent] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const language = i18n.language || 'es';
  
  // Generate cache key
  const cacheKey = useMemo(() => {
    if (!entityType || !entityId) return null;
    return `${entityType}_${entityId}_${language}`;
  }, [entityType, entityId, language]);
  
  // Fetch dynamic translations
  useEffect(() => {
    const fetchDynamicTranslations = async () => {
      // Skip if no entity info or Spanish (original language)
      if (!entityType || !entityId || language === 'es') {
        setDynamicContent(originalContent);
        return;
      }
      
      // Check cache first
      if (cacheKey && translationCache.has(cacheKey)) {
        setDynamicContent(translationCache.get(cacheKey)!);
        return;
      }
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('translations')
          .select('field_name, translated_text')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('language', language);
        
        if (error) {
          console.warn('[useUnifiedTranslation] Error fetching translations:', error);
          setDynamicContent(originalContent);
          return;
        }
        
        // Build translated content
        const translated: Record<string, string> = { ...originalContent };
        
        if (data && data.length > 0) {
          data.forEach(item => {
            if (item.translated_text) {
              translated[item.field_name] = item.translated_text;
            }
          });
        }
        
        // Cache the result
        if (cacheKey) {
          translationCache.set(cacheKey, translated);
        }
        
        setDynamicContent(translated);
      } catch (err) {
        console.error('[useUnifiedTranslation] Fetch error:', err);
        setDynamicContent(originalContent);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDynamicTranslations();
  }, [entityType, entityId, language, cacheKey, JSON.stringify(originalContent)]);
  
  // Get dynamic content with fallback chain
  const getDynamic = useCallback((field: string, fallback?: string): string => {
    // Priority: translated content → original content → fallback → empty string
    return dynamicContent[field] || originalContent[field] || fallback || '';
  }, [dynamicContent, originalContent]);
  
  // Change language and save preference
  const changeLanguage = useCallback(async (lng: string) => {
    await i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    
    // Update user profile if authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: lng })
          .eq('id', user.id);
      }
    } catch (err) {
      // Silent fail - language change still works
    }
  }, [i18n]);
  
  // Check if static translation exists
  const exists = useCallback((key: string): boolean => {
    return i18n.exists(key);
  }, [i18n]);
  
  // Enhanced t function that tries multiple namespaces
  const t = useCallback((key: string, options?: Record<string, unknown>): string => {
    // If key already includes namespace, use as-is
    if (key.includes(':')) {
      return staticT(key, options);
    }
    
    // Try common namespace first for general keys
    const commonResult = staticT(`common:${key}`, options);
    if (commonResult !== `common:${key}`) {
      return commonResult;
    }
    
    // Fall back to default behavior
    return staticT(key, options);
  }, [staticT]);
  
  return {
    t,
    getDynamic,
    language,
    changeLanguage,
    isLoading,
    exists,
    dynamicContent,
  };
}

// Clear translation cache (useful when translations are updated)
export function clearTranslationCache(): void {
  translationCache.clear();
}

// Clear cache for specific entity
export function clearEntityTranslationCache(entityType: string, entityId: string): void {
  const languages = ['en', 'nl', 'es'];
  languages.forEach(lang => {
    const key = `${entityType}_${entityId}_${lang}`;
    translationCache.delete(key);
  });
}
