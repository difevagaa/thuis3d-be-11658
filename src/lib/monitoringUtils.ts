/**
 * Production Monitoring and Metrics System
 * 
 * This module provides monitoring capabilities to detect and alert on:
 * - Infinite loading states
 * - Excessive channel accumulation
 * - Failed reconnections
 * - Performance degradation
 * 
 * Usage:
 * - Call reportLoadingState() when loading states change
 * - Call reportChannelMetrics() periodically
 * - Listen to monitoring events for alerts
 */

import { logger } from './logger';
import { getChannelStats, checkChannelHealth } from './channelManager';

// Types
export interface LoadingMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  componentName: string;
  timedOut: boolean;
  successful: boolean;
}

export interface ChannelMetrics {
  timestamp: number;
  activeChannels: number;
  totalCreated: number;
  totalRemoved: number;
  channelNames: string[];
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export interface PerformanceMetrics {
  timestamp: number;
  pageLoadTime?: number;
  timeToInteractive?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

// Monitoring state
const loadingStates = new Map<string, LoadingMetrics>();
const channelMetricsHistory: ChannelMetrics[] = [];
const MAX_HISTORY_SIZE = 100;

// Thresholds for alerts
const THRESHOLDS = {
  LOADING_TIMEOUT_MS: 30000, // 30 seconds
  LOADING_WARNING_MS: 10000, // 10 seconds
  CHANNEL_WARNING: 20,
  CHANNEL_CRITICAL: 50,
  MEMORY_WARNING_MB: 200,
  MEMORY_CRITICAL_MB: 500,
};

/**
 * Report when a loading state starts
 */
export function reportLoadingStart(componentName: string): string {
  const id = `${componentName}-${Date.now()}`;
  const metrics: LoadingMetrics = {
    startTime: Date.now(),
    componentName,
    timedOut: false,
    successful: false,
  };
  
  loadingStates.set(id, metrics);
  logger.debug(`[Monitoring] Loading started: ${componentName}`);
  
  return id;
}

/**
 * Report when a loading state ends
 */
export function reportLoadingEnd(id: string, successful: boolean = true): void {
  const metrics = loadingStates.get(id);
  if (!metrics) {
    logger.warn(`[Monitoring] Loading end reported for unknown ID: ${id}`);
    return;
  }
  
  metrics.endTime = Date.now();
  metrics.duration = metrics.endTime - metrics.startTime;
  metrics.successful = successful;
  
  // Check if loading took too long
  if (metrics.duration > THRESHOLDS.LOADING_WARNING_MS) {
    logger.warn(
      `[Monitoring] Slow loading detected in ${metrics.componentName}: ${metrics.duration}ms`
    );
    
    // Emit event for slow loading
    emitMonitoringEvent('slow-loading', {
      componentName: metrics.componentName,
      duration: metrics.duration,
    });
  }
  
  // Log successful completion
  logger.debug(
    `[Monitoring] Loading completed: ${metrics.componentName} (${metrics.duration}ms)`
  );
  
  // Clean up
  loadingStates.delete(id);
}

/**
 * Report when a loading state times out
 */
export function reportLoadingTimeout(componentName: string): void {
  logger.error(`[Monitoring] CRITICAL: Loading timeout in ${componentName}`);
  
  // Find and mark as timed out
  for (const [id, metrics] of loadingStates.entries()) {
    if (metrics.componentName === componentName && !metrics.endTime) {
      metrics.timedOut = true;
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      loadingStates.delete(id);
    }
  }
  
  // Emit critical event
  emitMonitoringEvent('loading-timeout', {
    componentName,
    severity: 'critical',
  });
}

/**
 * Get current loading states (for debugging)
 */
export function getActiveLoadingStates(): LoadingMetrics[] {
  return Array.from(loadingStates.values());
}

/**
 * Check for stuck loading states
 */
export function checkForStuckLoading(): LoadingMetrics[] {
  const stuck: LoadingMetrics[] = [];
  const now = Date.now();
  
  for (const metrics of loadingStates.values()) {
    if (!metrics.endTime && now - metrics.startTime > THRESHOLDS.LOADING_TIMEOUT_MS) {
      stuck.push(metrics);
      logger.error(
        `[Monitoring] STUCK LOADING DETECTED: ${metrics.componentName} (${now - metrics.startTime}ms)`
      );
    }
  }
  
  if (stuck.length > 0) {
    emitMonitoringEvent('stuck-loading', {
      count: stuck.length,
      components: stuck.map(s => s.componentName),
    });
  }
  
  return stuck;
}

/**
 * Report current channel metrics
 */
export function reportChannelMetrics(): ChannelMetrics {
  const stats = getChannelStats();
  const health = checkChannelHealth();
  
  const metrics: ChannelMetrics = {
    timestamp: Date.now(),
    activeChannels: stats.active,
    totalCreated: stats.created,
    totalRemoved: stats.removed,
    channelNames: stats.channels,
    healthStatus: health.healthy ? 'healthy' : 
                   stats.active > THRESHOLDS.CHANNEL_CRITICAL ? 'critical' : 'warning',
  };
  
  // Add to history
  channelMetricsHistory.push(metrics);
  
  // Keep history size manageable
  if (channelMetricsHistory.length > MAX_HISTORY_SIZE) {
    channelMetricsHistory.shift();
  }
  
  // Log if unhealthy
  if (metrics.healthStatus !== 'healthy') {
    logger.warn(`[Monitoring] Channel health: ${metrics.healthStatus}`, {
      activeChannels: metrics.activeChannels,
      channels: metrics.channelNames,
    });
    
    emitMonitoringEvent('channel-warning', {
      status: metrics.healthStatus,
      activeChannels: metrics.activeChannels,
    });
  }
  
  return metrics;
}

/**
 * Get channel metrics history
 */
export function getChannelMetricsHistory(): ChannelMetrics[] {
  return [...channelMetricsHistory];
}

/**
 * Report performance metrics
 */
export function reportPerformanceMetrics(): PerformanceMetrics | null {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }
  
  const metrics: PerformanceMetrics = {
    timestamp: Date.now(),
  };
  
  // Get navigation timing
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
    metrics.timeToInteractive = navigation.domInteractive - navigation.fetchStart;
  }
  
  // Get memory usage (Chrome only)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    
    // Check if memory usage is high
    if (metrics.memoryUsage > THRESHOLDS.MEMORY_WARNING_MB) {
      logger.warn(`[Monitoring] High memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
      
      if (metrics.memoryUsage > THRESHOLDS.MEMORY_CRITICAL_MB) {
        emitMonitoringEvent('memory-critical', {
          memoryUsage: metrics.memoryUsage,
        });
      }
    }
  }
  
  return metrics;
}

/**
 * Emit monitoring event for external listeners
 */
function emitMonitoringEvent(eventName: string, data: any): void {
  if (typeof window === 'undefined') return;
  
  const event = new CustomEvent(`monitoring:${eventName}`, {
    detail: {
      timestamp: Date.now(),
      ...data,
    },
  });
  
  window.dispatchEvent(event);
  
  // Also log to console for debugging
  logger.info(`[Monitoring] Event: ${eventName}`, data);
}

/**
 * Start periodic health checks
 */
export function startHealthMonitoring(intervalMs: number = 30000): () => void {
  logger.info('[Monitoring] Starting health monitoring');
  
  const intervalId = setInterval(() => {
    // Check for stuck loading states
    checkForStuckLoading();
    
    // Report channel metrics
    reportChannelMetrics();
    
    // Report performance metrics
    reportPerformanceMetrics();
  }, intervalMs);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    logger.info('[Monitoring] Stopped health monitoring');
  };
}

/**
 * Get comprehensive health report
 */
export function getHealthReport(): {
  loadingStates: LoadingMetrics[];
  channelMetrics: ChannelMetrics;
  performanceMetrics: PerformanceMetrics | null;
  overallHealth: 'healthy' | 'warning' | 'critical';
} {
  const loadingStates = getActiveLoadingStates();
  const channelMetrics = reportChannelMetrics();
  const performanceMetrics = reportPerformanceMetrics();
  
  // Determine overall health
  let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  if (channelMetrics.healthStatus === 'critical' || loadingStates.length > 0) {
    overallHealth = 'critical';
  } else if (channelMetrics.healthStatus === 'warning') {
    overallHealth = 'warning';
  }
  
  if (performanceMetrics?.memoryUsage && performanceMetrics.memoryUsage > THRESHOLDS.MEMORY_CRITICAL_MB) {
    overallHealth = 'critical';
  } else if (performanceMetrics?.memoryUsage && performanceMetrics.memoryUsage > THRESHOLDS.MEMORY_WARNING_MB) {
    if (overallHealth === 'healthy') {
      overallHealth = 'warning';
    }
  }
  
  return {
    loadingStates,
    channelMetrics,
    performanceMetrics,
    overallHealth,
  };
}

/**
 * Send health report to external monitoring service (e.g., Sentry, LogRocket)
 */
export function sendHealthReportToMonitoring(): void {
  const report = getHealthReport();
  
  // Log to console for now
  // In production, you would send this to your monitoring service
  logger.info('[Monitoring] Health Report:', report);
  
  // Example: Send to external service
  // if (window.Sentry) {
  //   window.Sentry.captureMessage('Health Report', {
  //     level: report.overallHealth === 'critical' ? 'error' : 'warning',
  //     extra: report,
  //   });
  // }
}

// Auto-start monitoring in browser
if (typeof window !== 'undefined') {
  // Start monitoring after a delay to avoid interfering with initial load
  setTimeout(() => {
    const stopMonitoring = startHealthMonitoring();
    
    // Expose to window for debugging
    (window as any).__monitoring = {
      getHealthReport,
      reportChannelMetrics,
      getActiveLoadingStates,
      checkForStuckLoading,
      stopMonitoring,
    };
  }, 5000);
  
  // Report on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      logger.info('[Monitoring] Page became visible, checking health...');
      checkForStuckLoading();
      reportChannelMetrics();
    }
  });
}
