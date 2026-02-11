// Global SEO cache to prevent duplicate requests
export const seoCache = new Map<string, { data: any; timestamp: number }>();
// Increased cache duration from 5 to 15 minutes for better performance
// SEO data doesn't change frequently, so longer cache is beneficial
export const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export const clearSeoCache = () => {
  seoCache.clear();
};

export const invalidateSeoCache = (key: string) => {
  seoCache.delete(key);
};
