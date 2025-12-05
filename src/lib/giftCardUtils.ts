import { DEFAULT_THEME, DEFAULT_ICON } from "@/constants/giftCardThemes";

/**
 * Parses the gift card message field to extract customization data.
 * The message field can contain either:
 * - A JSON object with { userMessage, themeId, iconId }
 * - A plain text message (for backwards compatibility)
 * 
 * @param message - The message field from the gift card database record
 * @returns Object containing userMessage, themeId, and iconId with defaults if not present
 */
export function parseGiftCardMessage(message: string | null) {
  if (!message) return { userMessage: null, themeId: DEFAULT_THEME.id, iconId: DEFAULT_ICON.id };
  
  try {
    const parsed = JSON.parse(message);
    return {
      userMessage: parsed.userMessage ?? null,
      themeId: parsed.themeId ?? DEFAULT_THEME.id,
      iconId: parsed.iconId ?? DEFAULT_ICON.id
    };
  } catch {
    // If not JSON, treat as plain message (backwards compatible)
    return { userMessage: message, themeId: DEFAULT_THEME.id, iconId: DEFAULT_ICON.id };
  }
}
