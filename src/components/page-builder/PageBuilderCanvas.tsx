import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GripVertical,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Edit2,
  Layout,
  Type,
  Image as ImageIcon,
  Square,
  Grid3X3,
  Star,
  MessageSquare,
  MousePointer,
  Minus,
  Code,
  Video
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface PageBuilderCanvasProps {
  sections: SectionData[];
  selectedSection: SectionData | null;
  onSelectSection: (section: SectionData) => void;
  onUpdateSection: (sectionId: string, updates: any) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (section: SectionData) => void;
  onReorderSections: (sections: SectionData[]) => void;
  previewMode: boolean;
}

const sectionTypeIcons: Record<string, React.ReactNode> = {
  'hero': <Layout className="h-4 w-4" />,
  'text': <Type className="h-4 w-4" />,
  'image': <ImageIcon className="h-4 w-4" />,
  'banner': <Square className="h-4 w-4" />,
  'gallery': <Grid3X3 className="h-4 w-4" />,
  'features': <Star className="h-4 w-4" />,
  'testimonials': <MessageSquare className="h-4 w-4" />,
  'cta': <MousePointer className="h-4 w-4" />,
  'divider': <Minus className="h-4 w-4" />,
  'spacer': <Square className="h-4 w-4" />,
  'custom': <Code className="h-4 w-4" />,
  'video': <Video className="h-4 w-4" />
};

function SortableSectionItem({ 
  section, 
  isSelected, 
  onSelect, 
  onDelete,
  onDuplicate,
  onToggleVisibility
}: {
  section: SectionData;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-lg transition-all ${
        isSelected 
          ? 'border-primary ring-2 ring-primary/20' 
          : 'border-dashed border-muted-foreground/30 hover:border-primary/50'
      } ${!section.is_visible ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-t-md border-b">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <span className="flex items-center gap-1.5">
          {sectionTypeIcons[section.section_type] || <Layout className="h-4 w-4" />}
          <span className="text-sm font-medium">{section.section_name}</span>
        </span>
        
        <Badge variant="outline" className="text-xs ml-auto">
          {section.section_type}
        </Badge>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            title={section.is_visible ? 'Ocultar' : 'Mostrar'}
          >
            {section.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            title="Duplicar"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Section Preview */}
      <SectionPreview section={section} />
    </div>
  );
}

function SectionPreview({ section }: { section: SectionData }) {
  const styles: React.CSSProperties = {
    backgroundColor: section.styles?.backgroundColor || 'transparent',
    color: section.styles?.textColor || 'inherit',
    textAlign: section.styles?.textAlign || 'left',
    padding: `${section.styles?.padding || 20}px`
  };

  switch (section.section_type) {
    case 'hero':
      return (
        <div style={styles} className="min-h-[120px] flex flex-col items-center justify-center bg-gradient-to-r from-primary/20 to-primary/10">
          {section.content?.backgroundImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${section.content.backgroundImage})` }}
            />
          )}
          <h2 className="text-xl font-bold relative">{section.content?.title || 'Título del Hero'}</h2>
          <p className="text-sm text-muted-foreground relative">{section.content?.subtitle || 'Subtítulo'}</p>
          {section.content?.buttonText && (
            <span className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground rounded text-sm relative">
              {section.content.buttonText}
            </span>
          )}
        </div>
      );

    case 'text':
      return (
        <div style={styles} className="min-h-[80px]">
          <h3 className="font-semibold mb-2">{section.content?.title || 'Título'}</h3>
          <p className="text-sm text-muted-foreground">{section.content?.text || 'Contenido de texto...'}</p>
        </div>
      );

    case 'image':
      return (
        <div style={styles} className="min-h-[100px] flex items-center justify-center">
          {section.content?.imageUrl ? (
            <img 
              src={section.content.imageUrl} 
              alt={section.content?.altText || 'Imagen'} 
              className="max-h-[150px] object-contain rounded"
            />
          ) : (
            <div className="w-full h-[100px] bg-muted rounded flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
      );

    case 'banner':
      return (
        <div 
          style={{
            ...styles,
            backgroundImage: section.content?.backgroundImage ? `url(${section.content.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} 
          className="min-h-[80px] flex flex-col items-center justify-center bg-gradient-to-r from-accent/30 to-accent/10"
        >
          <h3 className="font-semibold">{section.content?.title || 'Banner'}</h3>
          <p className="text-sm">{section.content?.description || 'Descripción del banner'}</p>
          {section.content?.buttonText && (
            <span className="mt-2 px-3 py-1 bg-primary/80 text-primary-foreground rounded text-xs">
              {section.content.buttonText}
            </span>
          )}
        </div>
      );

    case 'cta':
      return (
        <div style={styles} className="min-h-[80px] flex flex-col items-center justify-center bg-primary/5">
          <h3 className="font-semibold">{section.content?.title || '¿Listo para empezar?'}</h3>
          <p className="text-sm text-muted-foreground">{section.content?.description || ''}</p>
          <span className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground rounded text-sm">
            {section.content?.buttonText || 'Llamada a la acción'}
          </span>
        </div>
      );

    case 'features':
      return (
        <div style={styles} className="min-h-[60px] grid grid-cols-3 gap-4 py-4">
          <div className="text-center">
            <Star className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xs">Característica 1</p>
          </div>
          <div className="text-center">
            <Star className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xs">Característica 2</p>
          </div>
          <div className="text-center">
            <Star className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xs">Característica 3</p>
          </div>
        </div>
      );

    case 'gallery':
      return (
        <div style={styles} className="min-h-[60px] grid grid-cols-4 gap-2 py-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-muted rounded flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      );

    case 'testimonials':
      return (
        <div style={styles} className="min-h-[60px] flex gap-4 py-2">
          <div className="flex-1 bg-muted/50 rounded p-2">
            <MessageSquare className="h-4 w-4 mb-1 text-muted-foreground" />
            <p className="text-xs">"Testimonio de cliente..."</p>
          </div>
          <div className="flex-1 bg-muted/50 rounded p-2">
            <MessageSquare className="h-4 w-4 mb-1 text-muted-foreground" />
            <p className="text-xs">"Otro testimonio..."</p>
          </div>
        </div>
      );

    case 'divider':
      return (
        <div className="py-4 px-8">
          <hr className="border-muted-foreground/30" />
        </div>
      );

    case 'spacer':
      return (
        <div style={{ height: section.settings?.height || 60 }} className="bg-muted/30 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">{section.settings?.height || 60}px</span>
        </div>
      );

    case 'video':
      return (
        <div style={styles} className="min-h-[80px] flex items-center justify-center bg-muted/30">
          <Video className="h-8 w-8 text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Video</span>
        </div>
      );

    case 'custom':
      return (
        <div style={styles} className="min-h-[60px] bg-muted/30 flex items-center justify-center">
          <Code className="h-6 w-6 text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">HTML Personalizado</span>
        </div>
      );

    default:
      return (
        <div style={styles} className="min-h-[60px] flex items-center justify-center bg-muted/20">
          <span className="text-sm text-muted-foreground">{section.section_type}</span>
        </div>
      );
  }
}

export function PageBuilderCanvas({
  sections,
  selectedSection,
  onSelectSection,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onReorderSections,
  previewMode
}: PageBuilderCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      const reordered = arrayMove(sections, oldIndex, newIndex);
      onReorderSections(reordered);
    }
  };

  if (sections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/30 m-4 rounded-lg">
        <Layout className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Esta página está vacía</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Añade secciones desde el panel derecho para comenzar a diseñar
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3 min-h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map(section => (
              <SortableSectionItem
                key={section.id}
                section={section}
                isSelected={selectedSection?.id === section.id}
                onSelect={() => onSelectSection(section)}
                onDelete={() => onDeleteSection(section.id)}
                onDuplicate={() => onDuplicateSection(section)}
                onToggleVisibility={() => onUpdateSection(section.id, { is_visible: !section.is_visible })}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </ScrollArea>
  );
}
