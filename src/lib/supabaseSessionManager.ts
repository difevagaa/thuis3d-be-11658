/**
 * Supabase Session Manager
 * 
 * CRITICAL FIX for tab switching session loss issue (Issue #12)
 * 
 * PROBLEM:
 * - When user switches tabs and returns, session appears lost
 * - Products don't load, login state not recognized
 * - Requires constant page refresh
 * 
 * ROOT CAUSE:
 * - Supabase tries to refresh tokens when page becomes visible
 * - Storage events trigger during token refresh
 * - Session validation fails or times out
 * - State is lost or page reloads
 * 
 * SOLUTION:
 * - Prevent session operations while page is hidden
 * - Maintain session state during visibility changes
 * - Only validate session when truly necessary
 * - Never reload page unless explicitly signed out
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface SessionState {
  isValid: boolean;
  lastCheck: number;
  session: any;
  user: any;
}

class SupabaseSessionManager {
  private sessionState: SessionState = {
    isValid: false,
    lastCheck: 0,
    session: null,
    user: null,
  };

  private isPageVisible = true;
  private sessionCheckInterval: number | null = null;
  private readonly CHECK_INTERVAL_MS = 300000; // 5 minutes
  private readonly MIN_CHECK_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the session manager
   */
  private async initialize() {
    // Track page visibility
    this.isPageVisible = document.visibilityState === 'visible';
    
    document.addEventListener('visibilitychange', () => {
      const wasVisible = this.isPageVisible;
      this.isPageVisible = document.visibilityState === 'visible';
      
      if (!wasVisible && this.isPageVisible) {
        // Page became visible - validate session after a small delay
        logger.info('[SessionManager] Page became visible, will validate session');
        setTimeout(() => {
          this.validateSession(true);
        }, 1000);
      }
    });

    // Get initial session
    await this.validateSession(true);

    // Set up periodic validation (only when page is visible)
    this.sessionCheckInterval = window.setInterval(() => {
      if (this.isPageVisible) {
        this.validateSession(false);
      }
    }, this.CHECK_INTERVAL_MS);

    logger.info('[SessionManager] Initialized');
  }

  /**
   * Validate the current session
   */
  async validateSession(forceCheck = false): Promise<boolean> {
    const now = Date.now();

    // Throttle checks unless forced
    if (!forceCheck && now - this.sessionState.lastCheck < this.MIN_CHECK_INTERVAL_MS) {
      return this.sessionState.isValid;
    }

    try {
      // DON'T check session if page is hidden (prevents issues during tab switching)
      if (!this.isPageVisible && !forceCheck) {
        logger.debug('[SessionManager] Page hidden, skipping session check');
        return this.sessionState.isValid;
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      this.sessionState.lastCheck = now;

      if (error) {
        logger.warn('[SessionManager] Error getting session:', error.message);
        this.sessionState.isValid = false;
        this.sessionState.session = null;
        this.sessionState.user = null;
        return false;
      }

      if (session) {
        this.sessionState.isValid = true;
        this.sessionState.session = session;
        this.sessionState.user = session.user;
        logger.debug('[SessionManager] Session valid');
        return true;
      } else {
        this.sessionState.isValid = false;
        this.sessionState.session = null;
        this.sessionState.user = null;
        logger.debug('[SessionManager] No session found');
        return false;
      }
    } catch (error) {
      logger.error('[SessionManager] Unexpected error validating session:', error);
      // Don't invalidate session on unexpected errors
      return this.sessionState.isValid;
    }
  }

  /**
   * Get current session state
   */
  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionState.isValid && this.sessionState.session !== null;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.sessionState.user;
  }

  /**
   * Get current session
   */
  getSession() {
    return this.sessionState.session;
  }

  /**
   * Clear session state
   */
  clearSession() {
    this.sessionState.isValid = false;
    this.sessionState.session = null;
    this.sessionState.user = null;
    this.sessionState.lastCheck = 0;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    logger.info('[SessionManager] Destroyed');
  }
}

// Export singleton instance
export const sessionManager = new SupabaseSessionManager();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__sessionManager = sessionManager;
}
