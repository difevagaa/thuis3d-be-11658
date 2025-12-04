/**
 * Connection Recovery Hook - ULTRA SIMPLIFIED VERSION
 * 
 * THIS HOOK DOES ALMOST NOTHING BY DESIGN.
 * 
 * Previous versions tried to detect connection loss and dispatch events,
 * but this caused infinite loading issues because:
 * 1. Events were dispatched when tabs became visible
 * 2. Components listening to these events would reload data
 * 3. Queries would fail or timeout, causing more events
 * 4. This created an endless loop of loading states
 * 
 * The solution is to NOT dispatch any events.
 * React Query already handles refetchOnWindowFocus.
 * Individual components handle their own loading.
 */

export function useConnectionRecovery() {
  // This hook intentionally does nothing.
  // React Query handles data refetching on window focus.
  // Individual pages handle their own loading states.
  return {};
}
