/**
 * localStorage Debugger and Health Checker
 * 
 * Helps diagnose issues related to localStorage that might cause
 * infinite loading when switching tabs (works in incognito, fails in normal).
 * 
 * Common issues:
 * - Quota exceeded
 * - Corrupted data
 * - Large cached data causing performance issues
 * - Stale data from old sessions
 */

export interface LocalStorageHealthReport {
  totalSize: number;
  itemCount: number;
  largestItems: Array<{ key: string; size: number; sizeMB: number }>;
  quotaUsed: number;
  quotaTotal: number;
  quotaPercent: number;
  hasCorruptedItems: boolean;
  corruptedKeys: string[];
  warnings: string[];
  errors: string[];
  isHealthy: boolean;
}

/**
 * Calculate size of a value in bytes
 */
function getItemSize(value: string): number {
  return new Blob([value]).size;
}

/**
 * Get total localStorage size and quota usage
 */
async function getStorageQuota(): Promise<{ used: number; total: number }> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        total: estimate.quota || 0,
      };
    }
  } catch (error) {
    console.warn('[LocalStorageDebugger] Could not estimate storage quota:', error);
  }
  
  // Fallback: rough estimate based on localStorage content
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      totalSize += getItemSize(key) + getItemSize(value);
    }
  }
  
  return {
    used: totalSize,
    total: 10 * 1024 * 1024, // 10MB typical limit
  };
}

/**
 * Check if a localStorage item is corrupted
 */
function isItemCorrupted(key: string, value: string): boolean {
  // Check if it looks like JSON but fails to parse
  if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
    try {
      JSON.parse(value);
      return false;
    } catch {
      return true;
    }
  }
  
  // Check for null bytes or control characters (signs of corruption)
  const hasInvalidChars = /[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(value);
  if (hasInvalidChars) {
    return true;
  }
  
  return false;
}

/**
 * Get comprehensive health report of localStorage
 */
export async function getLocalStorageHealth(): Promise<LocalStorageHealthReport> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const corruptedKeys: string[] = [];
  const items: Array<{ key: string; size: number; sizeMB: number }> = [];
  
  let totalSize = 0;
  
  try {
    // Scan all items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        const size = getItemSize(key) + getItemSize(value);
        totalSize += size;
        
        items.push({
          key,
          size,
          sizeMB: size / (1024 * 1024),
        });
        
        // Check for corruption
        if (isItemCorrupted(key, value)) {
          corruptedKeys.push(key);
          warnings.push(`Corrupted data detected in key: ${key}`);
        }
        
        // Check for very large items (>1MB)
        if (size > 1024 * 1024) {
          warnings.push(`Large item detected: ${key} (${(size / (1024 * 1024)).toFixed(2)} MB)`);
        }
        
        // Check for old cached data (items with timestamps)
        if (key.includes('cache') || key.includes('temp')) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.timestamp) {
              const age = Date.now() - parsed.timestamp;
              const daysOld = age / (1000 * 60 * 60 * 24);
              if (daysOld > 7) {
                warnings.push(`Stale cached data: ${key} (${Math.floor(daysOld)} days old)`);
              }
            }
          } catch {
            // Not JSON or no timestamp, skip
          }
        }
      } catch (error) {
        errors.push(`Error reading key "${key}": ${error}`);
        corruptedKeys.push(key);
      }
    }
    
    // Get storage quota
    const quota = await getStorageQuota();
    const quotaPercent = quota.total > 0 ? (quota.used / quota.total) * 100 : 0;
    
    // Check quota usage
    if (quotaPercent > 90) {
      errors.push(`Storage quota critical: ${quotaPercent.toFixed(1)}% used`);
    } else if (quotaPercent > 75) {
      warnings.push(`Storage quota high: ${quotaPercent.toFixed(1)}% used`);
    } else if (quotaPercent > 50) {
      warnings.push(`Storage quota moderate: ${quotaPercent.toFixed(1)}% used`);
    }
    
    // Sort items by size (largest first)
    items.sort((a, b) => b.size - a.size);
    
    const isHealthy = errors.length === 0 && corruptedKeys.length === 0 && quotaPercent < 90;
    
    return {
      totalSize,
      itemCount: localStorage.length,
      largestItems: items.slice(0, 10), // Top 10 largest items
      quotaUsed: quota.used,
      quotaTotal: quota.total,
      quotaPercent,
      hasCorruptedItems: corruptedKeys.length > 0,
      corruptedKeys,
      warnings,
      errors,
      isHealthy,
    };
  } catch (error) {
    errors.push(`Fatal error scanning localStorage: ${error}`);
    return {
      totalSize: 0,
      itemCount: 0,
      largestItems: [],
      quotaUsed: 0,
      quotaTotal: 0,
      quotaPercent: 0,
      hasCorruptedItems: false,
      corruptedKeys: [],
      warnings,
      errors,
      isHealthy: false,
    };
  }
}

/**
 * Clean corrupted items from localStorage
 */
export function cleanCorruptedItems(): number {
  const corruptedKeys: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    try {
      const value = localStorage.getItem(key);
      if (value && isItemCorrupted(key, value)) {
        corruptedKeys.push(key);
      }
    } catch {
      corruptedKeys.push(key);
    }
  }
  
  corruptedKeys.forEach(key => {
    try {
      console.warn(`[LocalStorageDebugger] Removing corrupted key: ${key}`);
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[LocalStorageDebugger] Failed to remove corrupted key "${key}":`, error);
    }
  });
  
  return corruptedKeys.length;
}

/**
 * Clean old cached data from localStorage
 */
export function cleanOldCachedData(maxAgeDays: number = 7): number {
  const removedKeys: string[] = [];
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    // Only check cache/temp keys
    if (!key.includes('cache') && !key.includes('temp')) continue;
    
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;
      
      const parsed = JSON.parse(value);
      if (parsed.timestamp && typeof parsed.timestamp === 'number') {
        const age = now - parsed.timestamp;
        if (age > maxAgeMs) {
          console.info(`[LocalStorageDebugger] Removing old cached data: ${key} (${Math.floor(age / (1000 * 60 * 60 * 24))} days old)`);
          localStorage.removeItem(key);
          removedKeys.push(key);
        }
      }
    } catch {
      // Not JSON or no timestamp, skip
    }
  }
  
  return removedKeys.length;
}

/**
 * Print detailed health report to console
 */
export async function printHealthReport() {
  const health = await getLocalStorageHealth();
  
  console.group('📊 LocalStorage Health Report');
  console.log('Status:', health.isHealthy ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED');
  console.log('Total Items:', health.itemCount);
  console.log('Total Size:', (health.totalSize / 1024).toFixed(2), 'KB');
  console.log('Quota Used:', health.quotaPercent.toFixed(1) + '%', 
              `(${(health.quotaUsed / (1024 * 1024)).toFixed(2)} MB / ${(health.quotaTotal / (1024 * 1024)).toFixed(2)} MB)`);
  
  if (health.largestItems.length > 0) {
    console.group('📦 Largest Items:');
    health.largestItems.forEach((item, i) => {
      console.log(`${i + 1}. ${item.key}: ${item.sizeMB.toFixed(3)} MB`);
    });
    console.groupEnd();
  }
  
  if (health.warnings.length > 0) {
    console.group('⚠️  Warnings:');
    health.warnings.forEach(w => console.warn(w));
    console.groupEnd();
  }
  
  if (health.errors.length > 0) {
    console.group('❌ Errors:');
    health.errors.forEach(e => console.error(e));
    console.groupEnd();
  }
  
  if (health.hasCorruptedItems) {
    console.group('🔴 Corrupted Items:');
    health.corruptedKeys.forEach(k => console.error(k));
    console.groupEnd();
  }
  
  console.groupEnd();
  
  return health;
}

/**
 * Auto-cleanup localStorage on startup
 * Returns true if cleanup was performed
 */
export async function autoCleanup(): Promise<boolean> {
  const health = await getLocalStorageHealth();
  
  let cleanupPerformed = false;
  
  // Clean corrupted items
  if (health.hasCorruptedItems) {
    const removed = cleanCorruptedItems();
    console.warn(`[LocalStorageDebugger] Auto-cleanup: Removed ${removed} corrupted items`);
    cleanupPerformed = true;
  }
  
  // Clean old cached data if quota is high
  if (health.quotaPercent > 75) {
    const removed = cleanOldCachedData(7);
    console.warn(`[LocalStorageDebugger] Auto-cleanup: Removed ${removed} old cached items`);
    cleanupPerformed = true;
  }
  
  // If still over quota, clean more aggressively
  if (health.quotaPercent > 90) {
    const removed = cleanOldCachedData(3); // Remove items older than 3 days
    console.warn(`[LocalStorageDebugger] Auto-cleanup: Aggressively removed ${removed} items due to quota`);
    cleanupPerformed = true;
  }
  
  return cleanupPerformed;
}

// Make available in window for debugging
if (typeof window !== 'undefined') {
  (window as any).__localStorageDebugger = {
    getHealth: getLocalStorageHealth,
    printReport: printHealthReport,
    cleanCorrupted: cleanCorruptedItems,
    cleanOldCache: cleanOldCachedData,
    autoCleanup,
  };
}
