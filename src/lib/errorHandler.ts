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
}

/**
 * Check if error is a Supabase schema cache error
 */
export const isSchemaGCacheError = (error: any): boolean => {
  if (!error) return false;
  const message = error.message || error.error || '';
  return message.includes('Could not find the table') || 
         (message.includes('relation') && message.includes('does not exist'));
};

/**
 * Handle Supabase errors
 */
export const handleSupabaseError = (
  error: Error | { message?: string } | unknown,
  options: ErrorOptions = {}
): void => {
  const {
    showToast = true,
    toastMessage,
    logError = true,
    context = "Supabase Error"
  } = options;

  if (logError) {
    logger.error(`${context}:`, error);
  }

  if (showToast) {
    // Check for schema cache errors first
    if (isSchemaGCacheError(error)) {
      toast.error("Error de base de datos: Por favor recarga la página e intenta nuevamente");
      return;
    }
    
    const defaultMessage = i18n.t('errors:general', { defaultValue: 'Ha ocurrido un error' });
    const errMsg = (error as any)?.message as string | undefined;
    if (errMsg) {
      toast.error(`${toastMessage || defaultMessage}: ${errMsg}`);
    } else {
      toast.error(toastMessage || defaultMessage);
    }
  }
};

/**
 * Handle generic errors
 */
export const handleError = (
  error: Error | { message?: string } | unknown,
  options: ErrorOptions = {}
): void => {
  const {
    showToast = true,
    toastMessage,
    logError = true,
    context = "Error"
  } = options;

  if (logError) {
    logger.error(`${context}:`, error);
  }

  if (showToast) {
    const defaultMessage = i18n.t('errors:general', { defaultValue: 'Ha ocurrido un error inesperado' });
    toast.error(toastMessage || defaultMessage);
  }
};

/**
 * Handle validation errors
 */
export const handleValidationError = (message: string): void => {
  logger.warn("Validation Error:", message);
  toast.error(message);
};

/**
 * Handle network errors
 */
export const handleNetworkError = (error: Error | unknown): void => {
  logger.error("Network Error:", error);
  const message = i18n.t('errors:network', { defaultValue: 'Error de conexión. Por favor verifica tu internet' });
  toast.error(message);
};

/**
 * Handle authentication errors
 */
export const handleAuthError = (error: Error | { message?: string } | unknown): void => {
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
};

/**
 * Async error wrapper
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
