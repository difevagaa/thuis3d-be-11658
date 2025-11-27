import { toast } from 'sonner';
import i18n from '@/i18n/config';

interface I18nOptions {
  [key: string]: string | number;
}

/**
 * Helper para mostrar toasts traducidos automáticamente
 * Usa las claves de traducción del namespace 'messages'
 */
export const i18nToast = {
  success: (key: string, options?: I18nOptions) => {
    const message = i18n.t(key, { ...options, ns: 'messages' }) as string;
    toast.success(message);
  },
  error: (key: string, options?: I18nOptions) => {
    const message = i18n.t(key, { ...options, ns: 'messages' }) as string;
    toast.error(message);
  },
  info: (key: string, options?: I18nOptions) => {
    const message = i18n.t(key, { ...options, ns: 'messages' }) as string;
    toast.info(message);
  },
  warning: (key: string, options?: I18nOptions) => {
    const message = i18n.t(key, { ...options, ns: 'messages' }) as string;
    toast.warning(message);
  },
  loading: (key: string, options?: I18nOptions) => {
    const message = i18n.t(key, { ...options, ns: 'messages' }) as string;
    return toast.loading(message);
  },
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },
  /**
   * Promise-based toast for async operations
   */
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
    options?: I18nOptions
  ) => {
    return toast.promise(promise, {
      loading: i18n.t(messages.loading, { ...options, ns: 'messages' }) as string,
      success: i18n.t(messages.success, { ...options, ns: 'messages' }) as string,
      error: i18n.t(messages.error, { ...options, ns: 'messages' }) as string,
    });
  },
  // Mantener compatibilidad con mensajes directos (sin traducción)
  directSuccess: (message: string) => toast.success(message),
  directError: (message: string) => toast.error(message),
  directInfo: (message: string) => toast.info(message),
  directWarning: (message: string) => toast.warning(message),
};
