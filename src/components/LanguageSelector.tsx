import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = async (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    
    // Si el usuario está autenticado, guardar preferencia en BD
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Temporalmente comentado hasta que se ejecute la migración que agrega preferred_language
        // await supabase
        //   .from('profiles')
        //   .update({ preferred_language: lng })
        //   .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error guardando preferencia de idioma:', error);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-12 w-12 min-h-[48px] min-w-[48px] rounded-xl hover:bg-muted transition-all active:scale-95 flex-shrink-0 touch-manipulation bg-muted/50"
          aria-label="Seleccionar idioma"
        >
          <span className="text-2xl">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-background border shadow-lg rounded-xl min-w-[160px] p-2">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`cursor-pointer h-12 rounded-lg text-base ${i18n.language === language.code ? 'bg-accent font-medium' : ''}`}
          >
            <span className="mr-3 text-xl">{language.flag}</span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
