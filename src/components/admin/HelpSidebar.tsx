import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HelpCircle,
  Search,
  Info,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  CheckCircle,
  ExternalLink,
  Video,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { ContextualHelp } from '@/hooks/useContextualHelp';
import { cn } from '@/lib/utils';

interface HelpSidebarProps {
  helps: ContextualHelp[];
  sectionName: string;
  onViewed?: (helpId: string) => void;
  onFeedback?: (helpId: string, isHelpful: boolean) => void;
}

/**
 * Panel lateral de ayuda que muestra todas las ayudas disponibles
 * para la sección actual del admin
 */
export const HelpSidebar: React.FC<HelpSidebarProps> = ({
  helps,
  sectionName,
  onViewed,
  onFeedback
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  // Filtrar ayudas por búsqueda y tipo
  const filteredHelps = helps.filter(help => {
    const matchesSearch = !searchTerm || 
      help.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      help.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || help.help_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // Agrupar por tipo
  const groupedByType = filteredHelps.reduce((acc, help) => {
    if (!acc[help.help_type]) {
      acc[help.help_type] = [];
    }
    acc[help.help_type].push(help);
    return acc;
  }, {} as Record<string, ContextualHelp[]>);

  // Tipos únicos para filtros
  const uniqueTypes = Array.from(new Set(helps.map(h => h.help_type)));

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
      tooltip: 'Ayuda Rápida',
      info_box: 'Información',
      tutorial: 'Tutorial',
      warning: 'Advertencia',
      best_practice: 'Mejor Práctica',
      example: 'Ejemplo',
      tip: 'Consejo',
      faq: 'Preguntas Frecuentes'
    };
    return labels[type] || type;
  };

  const handleHelpClick = (helpId: string) => {
    if (expandedHelp === helpId) {
      setExpandedHelp(null);
    } else {
      setExpandedHelp(helpId);
      if (onViewed) {
        onViewed(helpId);
      }
    }
  };

  const handleFeedback = (helpId: string, isHelpful: boolean) => {
    if (onFeedback) {
      onFeedback(helpId, isHelpful);
      setFeedbackGiven({ ...feedbackGiven, [helpId]: true });
      setTimeout(() => {
        setFeedbackGiven(prev => ({ ...prev, [helpId]: false }));
      }, 2000);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Centro de Ayuda
          {helps.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {helps.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[500px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Centro de Ayuda
            </SheetTitle>
            <SheetDescription>
              {sectionName}
            </SheetDescription>
          </SheetHeader>

          {/* Search and Filters */}
          <div className="p-4 space-y-3 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar ayuda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={selectedType === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedType('all')}
              >
                Todas ({helps.length})
              </Button>
              {uniqueTypes.map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={selectedType === type ? 'default' : 'outline'}
                  onClick={() => setSelectedType(type)}
                >
                  {getTypeLabel(type)} ({helps.filter(h => h.help_type === type).length})
                </Button>
              ))}
            </div>
          </div>

          {/* Help Items */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {filteredHelps.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No se encontraron ayudas</p>
                </div>
              ) : (
                Object.entries(groupedByType).map(([type, typeHelps]) => (
                  <div key={type} className="space-y-2">
                    <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                      {getIcon(type)}
                      {getTypeLabel(type)}
                    </h3>
                    <div className="space-y-2">
                      {typeHelps.map(help => (
                        <div
                          key={help.id}
                          className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
                        >
                          <button
                            onClick={() => handleHelpClick(help.id)}
                            className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              {getIcon(help.help_type)}
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{help.title}</h4>
                                {expandedHelp !== help.id && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {help.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                          
                          {expandedHelp === help.id && (
                            <div className="px-3 pb-3 space-y-3 border-t pt-3">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {help.content}
                              </p>
                              
                              {/* Links */}
                              {(help.related_docs_url || help.related_video_url) && (
                                <div className="flex gap-2">
                                  {help.related_docs_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1"
                                      asChild
                                    >
                                      <a href={help.related_docs_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Docs
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
                                    onClick={() => handleFeedback(help.id, true)}
                                    disabled={feedbackGiven[help.id]}
                                    className={cn(
                                      'p-1.5 rounded hover:bg-gray-100 transition-colors',
                                      feedbackGiven[help.id] && 'opacity-50 cursor-not-allowed'
                                    )}
                                  >
                                    <ThumbsUp className="h-4 w-4 text-green-600" />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(help.id, false)}
                                    disabled={feedbackGiven[help.id]}
                                    className={cn(
                                      'p-1.5 rounded hover:bg-gray-100 transition-colors',
                                      feedbackGiven[help.id] && 'opacity-50 cursor-not-allowed'
                                    )}
                                  >
                                    <ThumbsDown className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                              
                              {feedbackGiven[help.id] && (
                                <p className="text-xs text-center text-green-600 font-medium">
                                  ¡Gracias por tu feedback!
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <p className="text-xs text-center text-gray-600">
              ¿Necesitas más ayuda? Contacta con soporte
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
