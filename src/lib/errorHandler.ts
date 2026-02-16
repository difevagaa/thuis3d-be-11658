import { toast } from "sonner";
import { logger } from "./logger";
import i18n from "@/i18n/config";

/**
 * Centralized error handling utilities with i18n support
 */

export interface ErrorOptions {
  showToast?: boolean;
  toastMessage?: string;
  logError?: boolean;
  context?: string;
  silent?: boolean;
}

export interface ErrorResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Handle Supabase errors with improved error classification
 */
export const handleSupabaseError = (
  error: Error | { message?: string; code?: string } | unknown,
  options: ErrorOptions = {}
): void => {
  const {
    showToast = true,
    toastMessage,
    logError = true,
    context = "Supabase Error",
    silent = false
  } = options;

  if (logError && !silent) {
    logger.error(`${context}:`, error);
  }

  if (showToast && !silent) {
    const defaultMessage = i18n.t('errors:general', { defaultValue: 'Ha ocurrido un error' });
    const errMsg = (error as any)?.message as string | undefined;
    const errCode = (error as any)?.code as string | undefined;

    // Handle specific Supabase error codes
    let message = toastMessage || defaultMessage;
    
    if (errCode === '23505') {
      message = 'Este registro ya existe';
    } else if (errCode === '23503') {
      message = 'No se puede completar la operación debido a restricciones de datos';
    } else if (errCode === 'PGRST116') {
      message = 'No se encontró el registro';
    } else if (errMsg) {
      message = `${toastMessage || defaultMessage}: ${errMsg}`;
    }

    toast.error(message);
  }
};

/**
 * Handle generic errors with retry capability
 */
export const handleError = (
  error: Error | { message?: string } | unknown,
  options: ErrorOptions = {}
): void => {
  const {
    showToast = true,
    toastMessage,
    logError = true,
    context = "Error",
    silent = false
  } = options;

  if (logError && !silent) {
    logger.error(`${context}:`, error);
  }

  if (showToast && !silent) {
    const defaultMessage = i18n.t('errors:general', { defaultValue: 'Ha ocurrido un error inesperado' });
    toast.error(toastMessage || defaultMessage);
  }
};

/**
 * Handle validation errors
 */
export const handleValidationError = (message: string, silent = false): void => {
  if (!silent) {
    logger.warn("Validation Error:", message);
    toast.error(message);
  }
};

/**
 * Handle network errors
 */
export const handleNetworkError = (error: Error | unknown, silent = false): void => {
  if (!silent) {
    logger.error("Network Error:", error);
    const message = i18n.t('errors:network', { defaultValue: 'Error de conexión. Por favor verifica tu internet' });
    toast.error(message);
  }
};

/**
 * Handle authentication errors
 */
export const handleAuthError = (error: Error | { message?: string } | unknown, silent = false): void => {
  if (!silent) {
    logger.error("Auth Error:", error);
    const msg: string = (error as any)?.message || '';
    if (msg.includes("Invalid login credentials")) {
      const message = i18n.t('errors:unauthorized', { defaultValue: 'Credenciales inválidas' });
      toast.error(message);
    } else if (msg.includes("Email not confirmed")) {
      toast.error("Por favor confirma tu email");
    } else {
      const message = i18n.t('errors:unauthorized', { defaultValue: 'Error de autenticación' });
      toast.error(message);
    }
  }
};

/**
 * Async error wrapper with improved error handling
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  options: ErrorOptions = {}
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    handleError(error, options);
    return null;
  }
};

/**
 * Try-catch wrapper that returns ErrorResult
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  context?: string
): Promise<ErrorResult<T>> => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`${context || 'Operation'} failed:`, error);
    return { success: false, error: errorMessage };
  }
};

/**
 * Try-catch wrapper with specific error handling
 */
export const tryCatch = async <T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error | unknown) => void
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      handleError(error);
    }
    return null;
  }
};

/**
 * Retry async function with exponential backoff
 */
export const retryAsync = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    context?: string;
  } = {}
): Promise<T | null> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    context = 'Operation'
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`${context} failed (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  handleError(lastError, { context: `${context} (after ${maxRetries} retries)` });
  return null;
};

