import { useTranslation } from 'react-i18next';
import { logger } from "@/lib/logger";
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = async (lng: string) => {
    // Change language in i18next
    await i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    
    // Save to profile if user is authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: lng })
          .eq('id', user.id);
        
        if (error) {
          logger.error('Error saving language preference:', error);
        }
      }
    } catch (error) {
      logger.error('Error saving language preference:', error);
    }
  };

  // Get current language, defaulting to first language if undefined
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[1]; // Default to English

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 sm:h-12 sm:w-12 min-h-[40px] min-w-[40px] rounded-lg sm:rounded-xl hover:bg-white/10 transition-all active:scale-95 flex-shrink-0 touch-manipulation"
          aria-label="Seleccionar idioma"
        >
          <span className="text-xl sm:text-2xl">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-background border shadow-lg rounded-xl min-w-[160px] p-2">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`cursor-pointer h-12 rounded-lg text-base ${currentLang === language.code ? 'bg-accent font-medium' : ''}`}
          >
            <span className="mr-3 text-xl">{language.flag}</span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
