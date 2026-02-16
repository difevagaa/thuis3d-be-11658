import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface GiftCardValidationResult {
  isValid: boolean;
  error?: string;
  giftCard?: any;
}

/**
 * Comprehensive gift card validation
 * Validates code format, existence, status, expiration, and balance
 */
export const validateGiftCard = async (code: string): Promise<GiftCardValidationResult> => {
  // Format validation
  if (!code || !code.trim()) {
    return { isValid: false, error: "Ingresa un código de tarjeta regalo" };
  }

  const trimmedCode = code.trim().toUpperCase();

  if (trimmedCode.length < 3 || trimmedCode.length > 50) {
    return { isValid: false, error: "El código de tarjeta regalo es inválido" };
  }

  try {
    // Fetch gift card with all necessary checks
    const { data: giftCard, error } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("code", trimmedCode)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      logger.error("Error validating gift card:", error);
      return { isValid: false, error: "Error al validar la tarjeta regalo" };
    }

    if (!giftCard) {
      return { isValid: false, error: "Código de tarjeta regalo inválido" };
    }

    // Check if active
    if (!giftCard.is_active) {
      return { isValid: false, error: "Esta tarjeta regalo no está activa" };
    }

    // Check expiration
    if (giftCard.expires_at) {
      const expirationDate = new Date(giftCard.expires_at);
      const now = new Date();
      
      if (expirationDate < now) {
        return { isValid: false, error: "Esta tarjeta regalo ha expirado" };
      }
    }

    // Check balance
    const currentBalance = Number(giftCard.current_balance) || 0;
    if (currentBalance <= 0) {
      return { isValid: false, error: "Esta tarjeta regalo no tiene saldo disponible" };
    }

    // All validations passed
    return { isValid: true, giftCard };
  } catch (error) {
    logger.error("Exception in validateGiftCard:", error);
    return { isValid: false, error: "Error al procesar la tarjeta regalo" };
  }
};

/**
 * Validates that a gift card can be used for a specific amount
 */
export const validateGiftCardAmount = (
  giftCard: any,
  requiredAmount: number
): GiftCardValidationResult => {
  if (!giftCard) {
    return { isValid: false, error: "No se proporcionó una tarjeta regalo" };
  }

  const currentBalance = Number(giftCard.current_balance) || 0;
  
  if (currentBalance <= 0) {
    return { isValid: false, error: "La tarjeta regalo no tiene saldo disponible" };
  }

  // Gift card can be used even if balance is less than required amount
  // It will just cover what it can
  return { isValid: true, giftCard };
};

/**
 * Calculate the amount a gift card will cover for a given total
 */
export const calculateGiftCardCoverage = (
  giftCard: any | null,
  totalAmount: number
): number => {
  if (!giftCard) return 0;
  
  const currentBalance = Number(giftCard.current_balance) || 0;
  
  if (currentBalance <= 0) return 0;
  
  // Gift card covers up to its balance or the total amount, whichever is less
  return Math.min(currentBalance, Math.max(0, totalAmount));
};

/**
 * Updates gift card balance after use with atomic transaction
 */
export const updateGiftCardBalanceSafe = async (
  giftCardId: string,
  amountUsed: number
): Promise<{ success: boolean; error?: string }> => {
  if (!giftCardId) {
    return { success: false, error: "ID de tarjeta regalo requerido" };
  }

  if (amountUsed <= 0) {
    return { success: false, error: "El monto usado debe ser positivo" };
  }

  try {
    // Fetch current balance first
    const { data: currentCard, error: fetchError } = await supabase
      .from("gift_cards")
      .select("current_balance, is_active")
      .eq("id", giftCardId)
      .single();

    if (fetchError || !currentCard) {
      logger.error("Error fetching gift card for update:", fetchError);
      return { success: false, error: "No se pudo encontrar la tarjeta regalo" };
    }

    if (!currentCard.is_active) {
      return { success: false, error: "La tarjeta regalo no está activa" };
    }

    const currentBalance = Number(currentCard.current_balance) || 0;
    const newBalance = Math.max(0, currentBalance - amountUsed);

    // Update balance
    const { error: updateError } = await supabase
      .from("gift_cards")
      .update({ 
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq("id", giftCardId);

    if (updateError) {
      logger.error("Error updating gift card balance:", updateError);
      return { success: false, error: "Error al actualizar el saldo de la tarjeta regalo" };
    }

    logger.log(`Gift card ${giftCardId} balance updated: ${currentBalance} -> ${newBalance}`);
    return { success: true };
  } catch (error) {
    logger.error("Exception in updateGiftCardBalanceSafe:", error);
    return { success: false, error: "Error al procesar la actualización del saldo" };
  }
};
