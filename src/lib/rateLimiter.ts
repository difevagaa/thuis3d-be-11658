/**
 * Simple Rate Limiter for client-side protection
 * Previene intentos excesivos de login, registro, etc.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blocked: boolean;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuración
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Verifica si una acción está permitida
 */
export function checkRateLimit(key: string): { allowed: boolean; remainingAttempts?: number; blockedUntil?: Date } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Si no hay entrada, permitir
  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  // Si está bloqueado, verificar si ya pasó el tiempo de bloqueo
  if (entry.blocked && entry.blockedUntil) {
    if (now < entry.blockedUntil) {
      return {
        allowed: false,
        blockedUntil: new Date(entry.blockedUntil)
      };
    } else {
      // Bloqueo expirado, resetear
      rateLimitStore.delete(key);
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
    }
  }

  // Verificar si la ventana de tiempo expiró
  if (now - entry.firstAttempt > WINDOW_MS) {
    // Resetear contador
    rateLimitStore.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  // Verificar si excedió el límite
  if (entry.count >= MAX_ATTEMPTS) {
    // Bloquear
    entry.blocked = true;
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    rateLimitStore.set(key, entry);
    
    return {
      allowed: false,
      blockedUntil: new Date(entry.blockedUntil)
    };
  }

  // Permitir pero incrementar contador
  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.count - 1
  };
}

/**
 * Registra un intento
 */
export function recordAttempt(key: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: now,
      blocked: false
    });
  } else {
    entry.count++;
    rateLimitStore.set(key, entry);
  }
}

/**
 * Resetea el rate limit para una clave (después de login exitoso)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Limpia entradas antiguas periódicamente
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Si está bloqueado y el bloqueo expiró
    if (entry.blocked && entry.blockedUntil && now > entry.blockedUntil) {
      rateLimitStore.delete(key);
      continue;
    }
    
    // Si no está bloqueado y la ventana expiró
    if (!entry.blocked && now - entry.firstAttempt > WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}

// Limpiar cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Formatea el tiempo restante de bloqueo
 */
export function formatBlockedTime(blockedUntil: Date): string {
  const now = Date.now();
  const diff = blockedUntil.getTime() - now;
  
  if (diff <= 0) return '0 minutos';
  
  const minutes = Math.ceil(diff / (60 * 1000));
  
  if (minutes < 60) {
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours} hora${hours !== 1 ? 's' : ''}${remainingMinutes > 0 ? ` y ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}` : ''}`;
}
