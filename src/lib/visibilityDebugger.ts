/**
 * Visibility Change Debugger
 * 
 * Tracks and logs visibility changes to help diagnose infinite loading
 * when users switch tabs and return.
 * 
 * This is critical for debugging because the issue happens specifically
 * when tabs become hidden and then visible again.
 */

export interface VisibilityEvent {
  timestamp: number;
  state: 'visible' | 'hidden';
  duration?: number; // Time spent in previous state (ms)
  activeQueries?: number;
  activeChannels?: number;
  loadingStates?: string[];
}

const visibilityHistory: VisibilityEvent[] = [];
let lastVisibilityChange: number = Date.now();
let currentState: 'visible' | 'hidden' = document.visibilityState as 'visible' | 'hidden';
let isMonitoring = false;

/**
 * Get information about current active queries
 */
function getActiveQueriesCount(): number {
  try {
    // Try to access React Query's query cache
    const queryClient = (window as any).__queryClient;
    if (queryClient) {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      return queries.filter((q: any) => q.state.status === 'pending').length;
    }
  } catch {
    // Ignore
  }
  return 0;
}

/**
 * Get information about active Supabase channels
 */
function getActiveChannelsCount(): number {
  try {
    const channelManager = (window as any).__channelManager;
    if (channelManager && channelManager.getChannelStats) {
      const stats = channelManager.getChannelStats();
      return stats.active || 0;
    }
  } catch {
    // Ignore
  }
  return 0;
}

/**
 * Get current loading states from monitoring
 */
function getActiveLoadingStates(): string[] {
  try {
    const monitoring = (window as any).__monitoring;
    if (monitoring && monitoring.getActiveLoadingStates) {
      const states = monitoring.getActiveLoadingStates();
      return states.map((s: any) => s.component);
    }
  } catch {
    // Ignore
  }
  return [];
}

/**
 * Record a visibility change event
 */
function recordVisibilityChange(newState: 'visible' | 'hidden') {
  const now = Date.now();
  const duration = now - lastVisibilityChange;
  
  const event: VisibilityEvent = {
    timestamp: now,
    state: newState,
    duration,
    activeQueries: getActiveQueriesCount(),
    activeChannels: getActiveChannelsCount(),
    loadingStates: getActiveLoadingStates(),
  };
  
  visibilityHistory.push(event);
  
  // Keep only last 50 events
  if (visibilityHistory.length > 50) {
    visibilityHistory.shift();
  }
  
  lastVisibilityChange = now;
  currentState = newState;
  
  // Log the change
  const emoji = newState === 'visible' ? '👁️' : '🙈';
  console.log(
    `${emoji} [VisibilityDebugger] Tab ${newState} (was ${newState === 'visible' ? 'hidden' : 'visible'} for ${(duration / 1000).toFixed(1)}s)`,
    {
      activeQueries: event.activeQueries,
      activeChannels: event.activeChannels,
      loadingStates: event.loadingStates,
    }
  );
  
  // Emit custom event for other components to listen
  window.dispatchEvent(new CustomEvent('visibility-tracked', { detail: event }));
}

/**
 * Start monitoring visibility changes
 */
export function startVisibilityMonitoring() {
  if (isMonitoring) return;
  
  isMonitoring = true;
  console.log('[VisibilityDebugger] Started monitoring visibility changes');
  
  // Track initial state
  recordVisibilityChange(currentState);
  
  // Listen for visibility changes
  document.addEventListener('visibilitychange', () => {
    const newState = document.visibilityState as 'visible' | 'hidden';
    recordVisibilityChange(newState);
  });
  
  // Also track focus/blur (some browsers don't trigger visibilitychange reliably)
  window.addEventListener('focus', () => {
    if (currentState !== 'visible') {
      console.log('[VisibilityDebugger] Window focus detected, updating to visible');
      recordVisibilityChange('visible');
    }
  });
  
  window.addEventListener('blur', () => {
    if (currentState !== 'hidden') {
      console.log('[VisibilityDebugger] Window blur detected, updating to hidden');
      recordVisibilityChange('hidden');
    }
  });
}

/**
 * Stop monitoring visibility changes
 */
export function stopVisibilityMonitoring() {
  isMonitoring = false;
  console.log('[VisibilityDebugger] Stopped monitoring visibility changes');
}

/**
 * Get visibility history
 */
export function getVisibilityHistory(): VisibilityEvent[] {
  return [...visibilityHistory];
}

/**
 * Get statistics about visibility changes
 */
export function getVisibilityStats() {
  const totalChanges = visibilityHistory.length;
  const hiddenEvents = visibilityHistory.filter(e => e.state === 'hidden').length;
  const visibleEvents = visibilityHistory.filter(e => e.state === 'visible').length;
  
  const hiddenDurations = visibilityHistory
    .filter(e => e.state === 'visible' && e.duration)
    .map(e => e.duration!);
  
  const averageHiddenTime = hiddenDurations.length > 0
    ? hiddenDurations.reduce((a, b) => a + b, 0) / hiddenDurations.length
    : 0;
  
  const longestHiddenTime = hiddenDurations.length > 0
    ? Math.max(...hiddenDurations)
    : 0;
  
  return {
    totalChanges,
    hiddenEvents,
    visibleEvents,
    averageHiddenTime,
    longestHiddenTime,
    currentState,
    isMonitoring,
  };
}

/**
 * Print detailed visibility report
 */
export function printVisibilityReport() {
  const stats = getVisibilityStats();
  
  console.group('👁️ Visibility Change Report');
  console.log('Monitoring:', stats.isMonitoring ? '✅ Active' : '❌ Inactive');
  console.log('Current State:', stats.currentState);
  console.log('Total Changes:', stats.totalChanges);
  console.log('Hidden Events:', stats.hiddenEvents);
  console.log('Visible Events:', stats.visibleEvents);
  console.log('Average Hidden Time:', (stats.averageHiddenTime / 1000).toFixed(1), 's');
  console.log('Longest Hidden Time:', (stats.longestHiddenTime / 1000).toFixed(1), 's');
  
  if (visibilityHistory.length > 0) {
    console.group('📜 Recent Events (last 10):');
    visibilityHistory.slice(-10).forEach((event, i) => {
      const date = new Date(event.timestamp);
      const time = date.toLocaleTimeString();
      console.log(
        `${i + 1}. ${time} - ${event.state}`,
        `(duration: ${((event.duration || 0) / 1000).toFixed(1)}s)`,
        {
          queries: event.activeQueries,
          channels: event.activeChannels,
          loading: event.loadingStates,
        }
      );
    });
    console.groupEnd();
  }
  
  console.groupEnd();
}

/**
 * Detect potential infinite loading caused by visibility changes
 */
export function detectInfiniteLoadingPattern(): boolean {
  // Look for pattern: visible event with loading states that persist
  const recentEvents = visibilityHistory.slice(-5);
  
  for (const event of recentEvents) {
    if (event.state === 'visible' && event.loadingStates && event.loadingStates.length > 0) {
      // Check if any of these loading states are still active
      const currentLoadingStates = getActiveLoadingStates();
      const persistentStates = event.loadingStates.filter(s => currentLoadingStates.includes(s));
      
      if (persistentStates.length > 0) {
        const timeSinceEvent = Date.now() - event.timestamp;
        // If loading state persists for more than 10 seconds after becoming visible
        if (timeSinceEvent > 10000) {
          console.error(
            '[VisibilityDebugger] Potential infinite loading detected!',
            {
              eventTimestamp: new Date(event.timestamp).toLocaleTimeString(),
              timeSinceEvent: (timeSinceEvent / 1000).toFixed(1) + 's',
              persistentStates,
            }
          );
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Auto-check for infinite loading every 15 seconds
 */
export function startInfiniteLoadingDetection() {
  console.log('[VisibilityDebugger] Started infinite loading detection');
  
  const checkInterval = setInterval(() => {
    const detected = detectInfiniteLoadingPattern();
    if (detected) {
      window.dispatchEvent(new CustomEvent('infinite-loading-detected'));
    }
  }, 15000); // Check every 15 seconds
  
  // Return cleanup function
  return () => {
    clearInterval(checkInterval);
    console.log('[VisibilityDebugger] Stopped infinite loading detection');
  };
}

// Make available in window for debugging
if (typeof window !== 'undefined') {
  (window as any).__visibilityDebugger = {
    start: startVisibilityMonitoring,
    stop: stopVisibilityMonitoring,
    getHistory: getVisibilityHistory,
    getStats: getVisibilityStats,
    printReport: printVisibilityReport,
    detectInfiniteLoading: detectInfiniteLoadingPattern,
    startDetection: startInfiniteLoadingDetection,
  };
}
