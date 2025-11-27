/**
 * Text utility functions for content processing
 */

/**
 * Strip HTML tags from a string to get plain text
 * @param html - HTML string to strip
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

/**
 * Calculate estimated reading time based on word count
 * @param content - HTML or plain text content
 * @param wordsPerMinute - Reading speed (default: 200 wpm)
 * @returns Estimated reading time in minutes (minimum 1)
 */
export const calculateReadingTime = (
  content: string | null | undefined, 
  wordsPerMinute: number = 200
): number => {
  if (!content) return 1;
  
  const textContent = stripHtml(content).replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
  
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

/**
 * Truncate text to a specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};
