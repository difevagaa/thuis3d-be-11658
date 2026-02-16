import { toast } from "sonner";

/**
 * Centralized validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || !email.trim()) {
    return { isValid: false, error: "El email es requerido" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Por favor ingresa un email válido" };
  }

  if (email.length > 255) {
    return { isValid: false, error: "El email es demasiado largo (máximo 255 caracteres)" };
  }

  return { isValid: true };
};

/**
 * Phone validation
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: "El teléfono es requerido" };
  }

  if (phone.length < 6 || phone.length > 20) {
    return { isValid: false, error: "El teléfono debe tener entre 6 y 20 caracteres" };
  }

  return { isValid: true };
};

/**
 * Optional phone validation (only validates if provided)
 */
export const validatePhoneOptional = (phone: string): ValidationResult => {
  if (!phone || !phone.trim()) {
    return { isValid: true }; // Optional, so empty is valid
  }

  if (phone.length < 6 || phone.length > 20) {
    return { isValid: false, error: "El teléfono debe tener entre 6 y 20 caracteres" };
  }

  return { isValid: true };
};

/**
 * Numeric value validation
 */
export const validateNumeric = (value: string | number, fieldName: string, min?: number, max?: number): ValidationResult => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} debe ser un número válido` };
  }
  
  if (min !== undefined && numValue < min) {
    return { isValid: false, error: `${fieldName} debe ser al menos ${min}` };
  }
  
  if (max !== undefined && numValue > max) {
    return { isValid: false, error: `${fieldName} debe ser máximo ${max}` };
  }
  
  return { isValid: true };
};

/**
 * Safe division - prevents division by zero and handles edge cases
 */
export const safeDivide = (numerator: number, denominator: number, fallback: number = 0): number => {
  // Guard against invalid inputs
  if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
};

/**
 * Postal code validation
 */
export const validatePostalCode = (postalCode: string): ValidationResult => {
  if (!postalCode || !postalCode.trim()) {
    return { isValid: false, error: "El código postal es requerido" };
  }

  if (postalCode.length < 3 || postalCode.length > 10) {
    return { isValid: false, error: "El código postal debe tener entre 3 y 10 caracteres" };
  }

  return { isValid: true };
};

/**
 * Required field validation
 */
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  return { isValid: true };
};

/**
 * String length validation
 */
export const validateLength = (
  value: string,
  fieldName: string,
  min: number,
  max: number
): ValidationResult => {
  if (value.length < min) {
    return { isValid: false, error: `${fieldName} debe tener al menos ${min} caracteres` };
  }
  if (value.length > max) {
    return { isValid: false, error: `${fieldName} debe tener máximo ${max} caracteres` };
  }
  return { isValid: true };
};

/**
 * Shipping info validation
 */
export interface ShippingInfo {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
}

export const validateShippingInfo = (info: Partial<ShippingInfo>): ValidationResult => {
  // Validate required fields
  if (!info.full_name?.trim()) {
    return { isValid: false, error: "El nombre completo es requerido" };
  }

  if (!info.address?.trim()) {
    return { isValid: false, error: "La dirección es requerida" };
  }

  if (!info.city?.trim()) {
    return { isValid: false, error: "La ciudad es requerida" };
  }

  if (!info.country?.trim()) {
    return { isValid: false, error: "El país es requerido" };
  }

  // Validate email
  const emailValidation = validateEmail(info.email || "");
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  // Validate phone
  const phoneValidation = validatePhone(info.phone || "");
  if (!phoneValidation.isValid) {
    return phoneValidation;
  }

  // Validate postal code
  const postalValidation = validatePostalCode(info.postal_code || "");
  if (!postalValidation.isValid) {
    return postalValidation;
  }

  return { isValid: true };
};

/**
 * Coupon code validation
 */
export const validateCouponCode = (code: string): ValidationResult => {
  if (!code || !code.trim()) {
    return { isValid: false, error: "Ingresa un código de cupón" };
  }

  if (code.length > 50) {
    return { isValid: false, error: "El código de cupón es inválido" };
  }

  return { isValid: true };
};

/**
 * Gift card code validation
 */
export const validateGiftCardCode = (code: string): ValidationResult => {
  if (!code || !code.trim()) {
    return { isValid: false, error: "Ingresa un código de tarjeta regalo" };
  }

  if (code.length > 50) {
    return { isValid: false, error: "El código de tarjeta regalo es inválido" };
  }

  return { isValid: true };
};

/**
 * Helper to show validation error
 */
export const showValidationError = (result: ValidationResult): boolean => {
  if (!result.isValid && result.error) {
    toast.error(result.error);
    return false;
  }
  return true;
};

/**
 * URL validation and sanitization
 * Protects against XSS, javascript:, data:, and other malicious schemes
 */
export const validateURL = (url: string): ValidationResult => {
  if (!url || !url.trim()) {
    return { isValid: false, error: "La URL es requerida" };
  }

  const trimmedUrl = url.trim();

  // Check length
  if (trimmedUrl.length > 2048) {
    return { isValid: false, error: "La URL es demasiado larga (máximo 2048 caracteres)" };
  }

  // Try to parse as URL
  try {
    const urlObj = new URL(trimmedUrl);
    
    // Only allow safe protocols
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return { 
        isValid: false, 
        error: `Protocolo no permitido. Solo se permiten: ${allowedProtocols.join(', ')}` 
      };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+\s*=/i, // event handlers like onclick=
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(trimmedUrl)) {
        return { 
          isValid: false, 
          error: "La URL contiene patrones no permitidos por seguridad" 
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: "Por favor ingresa una URL válida (ej: https://ejemplo.com)" };
  }
};

/**
 * Sanitize URL - returns a safe URL or null
 * Use this before storing/displaying URLs
 */
export const sanitizeURL = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  const validation = validateURL(url);
  if (!validation.isValid) {
    // Log sin exponer la URL completa por seguridad
    console.warn('URL blocked for security reasons');
    return null;
  }

  return url.trim();
};

/**
 * Check if a URL is safe to use as href
 * Returns true only if the URL passes all security checks
 */
export const isSafeURL = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const validation = validateURL(url);
  return validation.isValid;
};
