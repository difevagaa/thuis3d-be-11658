// Global SEO cache to prevent duplicate requests
export const seoCache = new Map<string, { data: any; timestamp: number }>();
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const clearSeoCache = () => {
  seoCache.clear();
};

export const invalidateSeoCache = (key: string) => {
  seoCache.delete(key);
};
