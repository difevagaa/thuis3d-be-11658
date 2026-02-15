import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Info, AlertTriangle, HelpCircle, X } from 'lucide-react';
import { TransitionRule } from '@/hooks/useStatusTransitionRules';
import { useTranslation } from 'react-i18next';

interface SmartStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: TransitionRule;
  onOptionSelected: (option: string, reason?: string) => void;
  entityName?: string;
}

/**
 * Componente de diálogo inteligente para cambios de estado
 * Muestra sugerencias y opciones cuando el admin cambia estados
 */
export const SmartStatusDialog: React.FC<SmartStatusDialogProps> = ({
  open,
  onOpenChange,
  rule,
  onOptionSelected,
  entityName = 'elemento'
}) => {
  const { i18n } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [reason, setReason] = useState('');
  const [showReasonField, setShowReasonField] = useState(false);

  const language = i18n.language?.substring(0, 2) || 'es';

  // Obtener el label según el idioma
  const getLabel = (option: any) => {
    if (language === 'en' && option.label_en) return option.label_en;
    if (language === 'nl' && option.label_nl) return option.label_nl;
    return option.label_es;
  };

  // Icono según el tipo de prompt
  const getIcon = () => {
    switch (rule.prompt_type) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      case 'confirmation':
        return <AlertCircle className="h-6 w-6 text-orange-500" />;
      default:
        return <HelpCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  // Color del badge según el tipo
  const getBadgeVariant = (variant?: string): any => {
    switch (variant) {
      case 'destructive':
        return 'destructive';
      case 'outline':
        return 'outline';
      default:
        return 'default';
    }
  };

  const handleOptionClick = (optionValue: string, requiresReason: boolean = false) => {
    setSelectedOption(optionValue);
    if (requiresReason) {
      setShowReasonField(true);
    } else {
      setShowReasonField(false);
      onOptionSelected(optionValue);
      onOpenChange(false);
      setReason('');
    }
  };

  const handleConfirmWithReason = () => {
    if (showReasonField && !reason.trim()) {
      return; // No permitir continuar sin razón si es requerida
    }
    onOptionSelected(selectedOption, reason);
    onOpenChange(false);
    setReason('');
    setShowReasonField(false);
    setSelectedOption('');
  };

  const handleClose = () => {
    if (rule.is_mandatory) {
      // Si es obligatorio, no permitir cerrar sin seleccionar
      return;
    }
    onOpenChange(false);
    setReason('');
    setShowReasonField(false);
    setSelectedOption('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!rule.is_mandatory && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </button>
        )}
        
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle className="text-xl">{rule.prompt_title}</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-3">
            {rule.prompt_message}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!showReasonField ? (
            <div className="space-y-3">
              {rule.options && rule.options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleOptionClick(option.value, false)}
                  variant={option.variant === 'destructive' ? 'destructive' : option.variant === 'outline' ? 'outline' : 'default'}
                  className="w-full justify-start text-left h-auto py-3 px-4"
                >
                  <span className="flex-1">{getLabel(option)}</span>
                  {option.status && (
                    <Badge variant={getBadgeVariant(option.variant)} className="ml-2">
                      {option.status}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">
                  {language === 'en' ? 'Reason (required)' : 
                   language === 'nl' ? 'Reden (verplicht)' : 
                   'Razón (requerida)'}
                </Label>
                <Textarea
                  id="reason"
                  placeholder={
                    language === 'en' ? 'Please explain why...' : 
                    language === 'nl' ? 'Leg uit waarom...' : 
                    'Por favor explica por qué...'
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowReasonField(false);
                    setSelectedOption('');
                    setReason('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  {language === 'en' ? 'Back' : language === 'nl' ? 'Terug' : 'Volver'}
                </Button>
                <Button
                  onClick={handleConfirmWithReason}
                  disabled={!reason.trim()}
                  className="flex-1"
                >
                  {language === 'en' ? 'Confirm' : language === 'nl' ? 'Bevestigen' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {rule.is_mandatory && !showReasonField && (
          <div className="text-sm text-muted-foreground flex items-center gap-2 bg-muted p-3 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {language === 'en' ? 'You must select an option to continue.' :
               language === 'nl' ? 'Je moet een optie selecteren om door te gaan.' :
               'Debes seleccionar una opción para continuar.'}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
