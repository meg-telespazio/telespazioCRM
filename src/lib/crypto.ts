import CryptoJS from 'crypto-js';

// En producción, esto debería estar en una variable de entorno como NEXT_PUBLIC_CRYPTO_SECRET
// Para mayor seguridad en aplicaciones 100% cliente, considere usar Cloud Functions o un Vault dedicado.
const SECRET_KEY = process.env.NEXT_PUBLIC_CRYPTO_SECRET || 'telespazio-crm-secret-key-2026';

export const encrypt = (text: string): string => {
  if (!text) return '';
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return '';
  }
};

export const decrypt = (cipherText: string): string => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // Verificar si realmente se pudo descifrar (si el string era texto plano, esto podría fallar o devolver vacío)
    return decrypted || cipherText; 
  } catch (error) {
    // Si falla el descifrado, es probable que la contraseña esté en texto plano (migración)
    return cipherText;
  }
};
