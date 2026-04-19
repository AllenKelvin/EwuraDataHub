import crypto from 'crypto';
import bcryptjs from 'bcryptjs';

/**
 * Legacy password verification - SHA512 with salt
 * Old format: hash.salt (both hex-encoded)
 */
export function verifyLegacyPassword(plaintext: string, hashed: string): boolean {
  try {
    if (!hashed.includes('.')) {
      return false;
    }

    const [hash, salt] = hashed.split('.');
    if (!hash || !salt) {
      return false;
    }

    // Recreate the hash using the stored salt
    const computedHash = crypto
      .createHash('sha512')
      .update(plaintext + salt)
      .digest('hex');

    return computedHash === hash;
  } catch {
    return false;
  }
}

/**
 * Modern password verification - bcrypt
 * Format: $2b$...
 */
export async function verifyBcryptPassword(plaintext: string, hashed: string): Promise<boolean> {
  try {
    return await bcryptjs.compare(plaintext, hashed);
  } catch {
    return false;
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcryptjs.hash(plaintext, 10);
}

/**
 * Detect if password is in old format (legacy SHA512)
 */
export function isLegacyFormat(hashed: string): boolean {
  return hashed.includes('.') && !hashed.startsWith('$2');
}

/**
 * Verify password - supports both old and new formats
 * Returns { valid: boolean, needsMigration: boolean }
 */
export async function verifyPasswordWithMigration(
  plaintext: string,
  hashed: string
): Promise<{ valid: boolean; needsMigration: boolean }> {
  // Try legacy format first (synchronous, faster)
  if (isLegacyFormat(hashed)) {
    const valid = verifyLegacyPassword(plaintext, hashed);
    return { valid, needsMigration: valid }; // If valid with legacy, needs migration
  }

  // Try bcrypt format
  const valid = await verifyBcryptPassword(plaintext, hashed);
  return { valid, needsMigration: false }; // Bcrypt is current format
}
