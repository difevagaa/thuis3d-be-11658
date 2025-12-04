import DOMPurify from 'dompurify';

interface RichTextDisplayProps {
  content: string | null | undefined;
  className?: string;
}

export const RichTextDisplay = ({ content, className = '' }: RichTextDisplayProps) => {
  // Convertir markdown de imágenes a HTML antes de sanitizar
  let processedContent = content || '';
  
  // Convertir ![alt](url) a <figure><img /></figure>
  processedContent = processedContent.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<figure class="my-4"><img src="$2" alt="$1" class="rounded-lg shadow-md max-w-full h-auto" /></figure>'
  );
  
  // Configuración de DOMPurify para soportar imágenes con data URIs y estilos de Quill
  const sanitizedContent = DOMPurify.sanitize(processedContent, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'img', 'video',
      'span', 'div', 'sub', 'sup', 'figure', 'figcaption', 'table', 'thead', 
      'tbody', 'tr', 'th', 'td', 'iframe'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'class', 'style', 'target', 'rel', 'controls', 
      'width', 'height', 'title', 'colspan', 'rowspan', 'frameborder', 
      'allowfullscreen', 'data-*'
    ],
    // Permitir data URIs para imágenes (base64)
    ALLOW_DATA_ATTR: true,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
  });

  return (
    <div 
      className={`rich-text-content prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};
