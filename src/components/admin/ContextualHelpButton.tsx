import React, { useEffect, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Info,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  CheckCircle,
  X,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Video
} from 'lucide-react';
import { ContextualHelp } from '@/hooks/useContextualHelp';
import { cn } from '@/lib/utils';

interface ContextualHelpButtonProps {
  help: ContextualHelp;
  onViewed?: (helpId: string) => void;
  onClicked?: (helpId: string) => void;
  onDismissed?: (helpId: string) => void;
  onFeedback?: (helpId: string, isHelpful: boolean) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente de botón de ayuda contextual
 * Muestra ayudas con diferentes estilos según el tipo
 */
export const ContextualHelpButton: React.FC<ContextualHelpButtonProps> = ({
  help,
  onViewed,
  onClicked,
  onDismissed,
  onFeedback,
  className,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // Icono según el tipo de ayuda
  const getIcon = () => {
    const iconClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
    
    switch (help.help_type) {
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
      case 'example':
        return <BookOpen className={cn(iconClass, 'text-indigo-600')} />;
      case 'tooltip':
      case 'faq':
      default:
        return <HelpCircle className={cn(iconClass, 'text-gray-600')} />;
    }
  };

  // Color de fondo según el color configurado
  const getColorClass = () => {
    switch (help.color) {
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200';
      case 'red':
        return 'bg-red-50 border-red-200';
      case 'green':
        return 'bg-green-50 border-green-200';
      case 'blue':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Badge según el tipo
  const getTypeBadge = () => {
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

    const variants: Record<string, any> = {
      warning: 'destructive',
      best_practice: 'default',
      tip: 'secondary',
    };

    return (
      <Badge variant={variants[help.help_type] || 'outline'} className="text-xs">
        {labels[help.help_type] || 'Ayuda'}
      </Badge>
    );
  };

  // Registrar vista cuando se abre
  useEffect(() => {
    if (isOpen && !hasViewed && onViewed) {
      onViewed(help.id);
      setHasViewed(true);
    }
  }, [isOpen, hasViewed, help.id, onViewed]);

  const handleClick = () => {
    if (onClicked) {
      onClicked(help.id);
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    if (help.dismissible && onDismissed) {
      onDismissed(help.id);
    }
    setIsOpen(false);
  };

  const handleFeedback = (isHelpful: boolean) => {
    if (onFeedback) {
      onFeedback(help.id, isHelpful);
      setFeedbackGiven(true);
      setTimeout(() => setFeedbackGiven(false), 2000);
    }
  };

  // Para tooltips simples
  if (help.help_type === 'tooltip' && help.trigger_on === 'hover') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors',
                size === 'sm' && 'p-1',
                size === 'md' && 'p-1.5',
                size === 'lg' && 'p-2',
                className
              )}
              onMouseEnter={() => {
                if (onViewed && !hasViewed) {
                  onViewed(help.id);
                  setHasViewed(true);
                }
              }}
            >
              {getIcon()}
            </button>
          </TooltipTrigger>
          <TooltipContent side={help.position as any} className="max-w-xs">
            <p className="font-semibold mb-1">{help.title}</p>
            <p className="text-sm">{help.content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Para ayudas más complejas con popover
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            'inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors',
            size === 'sm' && 'p-1',
            size === 'md' && 'p-1.5',
            size === 'lg' && 'p-2',
            className
          )}
        >
          {getIcon()}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={help.position as any}
        className={cn('w-96 p-0 overflow-hidden border-2', getColorClass())}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {getIcon()}
              <div className="space-y-1 flex-1">
                <h4 className="font-semibold text-base leading-tight">{help.title}</h4>
                {getTypeBadge()}
              </div>
            </div>
            {help.dismissible && (
              <button
                onClick={handleClose}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {help.content}
          </div>

          {/* Links */}
          {(help.related_docs_url || help.related_video_url) && (
            <div className="flex gap-2 pt-2 border-t">
              {help.related_docs_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a href={help.related_docs_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Documentación
                  </a>
                </Button>
              )}
              {help.related_video_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a href={help.related_video_url} target="_blank" rel="noopener noreferrer">
                    <Video className="h-3 w-3 mr-1" />
                    Video
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Feedback */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-gray-600">¿Te fue útil?</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleFeedback(true)}
                disabled={feedbackGiven}
                className={cn(
                  'p-1.5 rounded hover:bg-white transition-colors',
                  feedbackGiven && 'opacity-50 cursor-not-allowed'
                )}
              >
                <ThumbsUp className="h-4 w-4 text-green-600" />
              </button>
              <button
                onClick={() => handleFeedback(false)}
                disabled={feedbackGiven}
                className={cn(
                  'p-1.5 rounded hover:bg-white transition-colors',
                  feedbackGiven && 'opacity-50 cursor-not-allowed'
                )}
              >
                <ThumbsDown className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
          
          {feedbackGiven && (
            <p className="text-xs text-center text-green-600 font-medium">
              ¡Gracias por tu feedback!
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
