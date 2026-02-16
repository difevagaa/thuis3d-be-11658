/**
 * Transaction Idempotency Manager
 * Previene procesamiento duplicado de pagos y órdenes
 * Usa transaction IDs únicos para garantizar idempotencia
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface TransactionRecord {
  transaction_id: string;
  order_id?: string;
  invoice_id?: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
  user_id?: string;
}

// Cache en memoria para validación rápida (24h TTL)
const transactionCache = new Map<string, { timestamp: number; status: string }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Genera un transaction ID único
 * Formato: TXN-{timestamp}-{random}-{hash}
 */
export function generateTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const hash = crypto.randomUUID().split('-')[0];
  return `TXN-${timestamp}-${random}-${hash}`.toUpperCase();
}

/**
 * Valida si un transaction ID es válido
 */
export function isValidTransactionId(transactionId: string): boolean {
  if (!transactionId) return false;
  
  // Formato: TXN-{timestamp}-{random}-{hash}
  const pattern = /^TXN-\d+-[a-z0-9]+-[a-f0-9]+$/i;
  return pattern.test(transactionId);
}

/**
 * Verifica si una transacción ya existe (idempotencia)
 * Retorna el estado de la transacción existente o null si no existe
 */
export async function checkTransactionExists(
  transactionId: string
): Promise<{
  exists: boolean;
  status?: 'pending' | 'completed' | 'failed';
  orderId?: string;
  invoiceId?: string;
  message?: string;
}> {
  try {
    if (!isValidTransactionId(transactionId)) {
      return {
        exists: false,
        message: 'Invalid transaction ID format'
      };
    }

    // 1. Verificar cache primero (más rápido)
    const cached = transactionCache.get(transactionId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.info('[Idempotency] Transaction found in cache', {
        transactionId,
        status: cached.status
      });
      return {
        exists: true,
        status: cached.status as any,
        message: 'Transaction found in cache'
      };
    }

    // 2. Buscar en localStorage (para mismo navegador)
    const localRecord = getLocalTransaction(transactionId);
    if (localRecord) {
      logger.info('[Idempotency] Transaction found in localStorage', {
        transactionId,
        status: localRecord.status
      });
      
      // Actualizar cache
      transactionCache.set(transactionId, {
        timestamp: Date.now(),
        status: localRecord.status
      });

      return {
        exists: true,
        status: localRecord.status,
        orderId: localRecord.orderId,
        invoiceId: localRecord.invoiceId,
        message: 'Transaction found in localStorage'
      };
    }

    // 3. Buscar en base de datos
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (error) {
      // Si la tabla no existe, asumimos que no hay duplicado
      logger.warn('[Idempotency] Could not check DB (table may not exist)', {
        transactionId,
        error
      });
      return { exists: false };
    }

    if (data) {
      logger.info('[Idempotency] Transaction found in database', {
        transactionId,
        status: data.status
      });

      // Actualizar cache y localStorage
      transactionCache.set(transactionId, {
        timestamp: Date.now(),
        status: data.status
      });
      
      saveLocalTransaction(transactionId, {
        status: data.status,
        orderId: data.order_id,
        invoiceId: data.invoice_id
      });

      return {
        exists: true,
        status: data.status,
        orderId: data.order_id,
        invoiceId: data.invoice_id,
        message: 'Transaction found in database'
      };
    }

    logger.info('[Idempotency] Transaction not found - safe to proceed', {
      transactionId
    });

    return { exists: false };
  } catch (error) {
    logger.error('[Idempotency] Error checking transaction', {
      transactionId,
      error
    });
    // En caso de error, permitir continuar para no bloquear pagos legítimos
    return { exists: false, message: 'Error checking, allowing to proceed' };
  }
}

/**
 * Registra una nueva transacción
 */
export async function registerTransaction(
  transactionId: string,
  data: {
    orderId?: string;
    invoiceId?: string;
    amount: number;
    currency?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[Idempotency] Registering new transaction', {
      transactionId,
      ...data
    });

    // 1. Validar formato
    if (!isValidTransactionId(transactionId)) {
      return { success: false, error: 'Invalid transaction ID format' };
    }

    // 2. Verificar que no exista
    const check = await checkTransactionExists(transactionId);
    if (check.exists) {
      logger.warn('[Idempotency] Transaction already exists', {
        transactionId,
        status: check.status
      });
      return {
        success: false,
        error: `Transaction already exists with status: ${check.status}`
      };
    }

    // 3. Registrar en localStorage primero (rápido)
    saveLocalTransaction(transactionId, {
      status: 'pending',
      orderId: data.orderId,
      invoiceId: data.invoiceId
    });

    // 4. Actualizar cache
    transactionCache.set(transactionId, {
      timestamp: Date.now(),
      status: 'pending'
    });

    // 5. Registrar en base de datos
    const { error } = await supabase
      .from('payment_transactions')
      .insert({
        transaction_id: transactionId,
        order_id: data.orderId,
        invoice_id: data.invoiceId,
        status: 'pending',
        amount: data.amount,
        currency: data.currency || 'EUR',
        user_id: data.userId,
        metadata: data.metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      logger.warn('[Idempotency] Could not save to DB (table may not exist)', {
        transactionId,
        error
      });
      // No es crítico - ya guardamos en localStorage
    }

    logger.info('[Idempotency] Transaction registered successfully', {
      transactionId
    });

    return { success: true };
  } catch (error) {
    logger.error('[Idempotency] Error registering transaction', {
      transactionId,
      error
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Actualiza el estado de una transacción
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: 'completed' | 'failed',
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[Idempotency] Updating transaction status', {
      transactionId,
      status
    });

    // 1. Actualizar localStorage
    const localRecord = getLocalTransaction(transactionId);
    if (localRecord) {
      saveLocalTransaction(transactionId, {
        ...localRecord,
        status
      });
    }

    // 2. Actualizar cache
    transactionCache.set(transactionId, {
      timestamp: Date.now(),
      status
    });

    // 3. Actualizar en base de datos
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from('payment_transactions')
      .update(updateData)
      .eq('transaction_id', transactionId);

    if (error) {
      logger.warn('[Idempotency] Could not update DB (table may not exist)', {
        transactionId,
        error
      });
    }

    logger.info('[Idempotency] Transaction status updated', {
      transactionId,
      status
    });

    return { success: true };
  } catch (error) {
    logger.error('[Idempotency] Error updating transaction status', {
      transactionId,
      error
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Guarda transacción en localStorage
 */
function saveLocalTransaction(
  transactionId: string,
  data: {
    status: string;
    orderId?: string;
    invoiceId?: string;
  }
): void {
  try {
    const key = `txn_${transactionId}`;
    const record = {
      ...data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    logger.warn('[Idempotency] Could not save to localStorage', {
      transactionId,
      error
    });
  }
}

/**
 * Obtiene transacción de localStorage
 */
function getLocalTransaction(transactionId: string): {
  status: string;
  orderId?: string;
  invoiceId?: string;
} | null {
  try {
    const key = `txn_${transactionId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const record = JSON.parse(stored);
    
    // Validar que no sea muy antiguo (24h)
    if (Date.now() - record.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return {
      status: record.status,
      orderId: record.orderId,
      invoiceId: record.invoiceId
    };
  } catch (error) {
    return null;
  }
}

/**
 * Limpia transacciones antiguas del cache y localStorage
 * Debe llamarse periódicamente
 */
export function cleanupOldTransactions(): void {
  try {
    const now = Date.now();

    // Limpiar cache en memoria
    for (const [transactionId, record] of transactionCache.entries()) {
      if (now - record.timestamp > CACHE_TTL_MS) {
        transactionCache.delete(transactionId);
      }
    }

    // Limpiar localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('txn_')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const record = JSON.parse(stored);
            if (now - record.timestamp > CACHE_TTL_MS) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Si falla el parse, remover
          localStorage.removeItem(key);
        }
      }
    }

    logger.info('[Idempotency] Cleanup completed', {
      cacheSize: transactionCache.size
    });
  } catch (error) {
    logger.error('[Idempotency] Error during cleanup', { error });
  }
}

// Ejecutar limpieza cada hora
if (typeof window !== 'undefined') {
  setInterval(cleanupOldTransactions, 60 * 60 * 1000);
}
