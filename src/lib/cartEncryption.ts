/**
 * Utilidad para encriptar y desencriptar datos sensibles del carrito
 * Usa Web Crypto API (AES-GCM) que es seguro y nativo del navegador
 */

// Obtener o crear un salt único por navegador
function getUserSalt(): Uint8Array {
  const SALT_KEY = 'thuis3d-cart-salt';
  let saltBase64 = localStorage.getItem(SALT_KEY);
  
  if (!saltBase64) {
    // Crear un salt aleatorio único para este navegador
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saltBase64 = btoa(String.fromCharCode(...salt));
    localStorage.setItem(SALT_KEY, saltBase64);
  }
  
  return Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
}

// Generar una clave a partir de un identificador único del navegador
async function getEncryptionKey(): Promise<CryptoKey> {
  // Usar un identificador único por navegador más estable
  // Combinar múltiples fuentes para mejor persistencia
  const browserFingerprint = [
    window.navigator.language,
    window.screen.width,
    window.screen.height,
    window.screen.colorDepth,
    new Date().getTimezoneOffset(),
    'thuis3d-cart-v2' // Versión del sistema
  ].join('|');
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(browserFingerprint),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Usar salt único por usuario
  const salt = getUserSalt();

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encripta datos y los retorna como string base64
 */
export async function encryptCartData(data: unknown): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Vector de inicialización
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedData
    );

    // Combinar IV y datos encriptados
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convertir a base64 para almacenar en localStorage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Error encrypting cart data:', error);
    throw new Error('Failed to encrypt cart data');
  }
}

/**
 * Desencripta datos desde string base64
 */
export async function decryptCartData<T>(encryptedString: string): Promise<T | null> {
  try {
    const key = await getEncryptionKey();
    
    // Convertir de base64 a Uint8Array
    const combined = Uint8Array.from(atob(encryptedString), c => c.charCodeAt(0));
    
    // Separar IV y datos encriptados
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );

    const decodedData = new TextDecoder().decode(decryptedData);
    return JSON.parse(decodedData) as T;
  } catch (error) {
    console.error('Error decrypting cart data:', error);
    return null;
  }
}

/**
 * Guarda datos del carrito encriptados en localStorage
 */
export async function saveEncryptedCart(cart: unknown): Promise<void> {
  try {
    const encrypted = await encryptCartData(cart);
    localStorage.setItem('cart_encrypted', encrypted);
    // Remover carrito sin encriptar si existe
    localStorage.removeItem('cart');
  } catch (error) {
    console.error('Error saving encrypted cart:', error);
    throw error;
  }
}

/**
 * Carga datos del carrito desencriptados desde localStorage
 */
export async function loadEncryptedCart<T>(): Promise<T | null> {
  try {
    const encrypted = localStorage.getItem('cart_encrypted');
    if (!encrypted) {
      // Intentar migrar carrito antiguo sin encriptar
      const oldCart = localStorage.getItem('cart');
      if (oldCart) {
        const parsed = JSON.parse(oldCart) as T;
        await saveEncryptedCart(parsed);
        return parsed;
      }
      return null;
    }
    
    return await decryptCartData<T>(encrypted);
  } catch (error) {
    console.error('Error loading encrypted cart:', error);
    // Si falla la desencriptación, limpiar y empezar de nuevo
    localStorage.removeItem('cart_encrypted');
    localStorage.removeItem('cart');
    return null;
  }
}

/**
 * Limpia los datos del carrito
 * Nota: También limpia el salt, lo que invalidará todos los carritos encriptados
 */
export function clearCart(): void {
  localStorage.removeItem('cart_encrypted');
  localStorage.removeItem('cart');
  // Nota: No removemos el salt para permitir desencriptar carritos antiguos
  // Si se desea un "reset" completo, descomentar la siguiente línea:
  // localStorage.removeItem('thuis3d-cart-salt');
}
