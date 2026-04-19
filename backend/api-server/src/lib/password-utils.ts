import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

/**
 * Legacy password verification - Scrypt with salt
 * Old format: hash.salt (both hex-encoded)
 */
export async function verifyLegacyPassword(plaintext: string, hashed: string): Promise<boolean> {
  try {
    if (!hashed.includes('.')) {
      return false;
    }

    const [hash, salt] = hashed.split('.');
    if (!hash || !salt) {
      return false;
    }

    // Recreate the scrypt hash using the stored salt
    const hashedPasswordBuf = Buffer.from(hash, 'hex');
    const suppliedPasswordBuf = (await scryptAsync(plaintext, salt, 64)) as Buffer;

    // Use timing-safe comparison
    try {
      return crypto.timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    } catch {
      return false;
    }
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
 * Detect if password is in old format (legacy scrypt)
 */
export function isLegacyFormat(hashed: string): boolean {
  return hashed.includes('.') && !hashed.startsWith('$2');
}

/**
 * Verify password - supports both old (scrypt) and new (bcrypt) formats
 * Returns { valid: boolean, needsMigration: boolean }
 */
export async function verifyPasswordWithMigration(
  plaintext: string,
  hashed: string
): Promise<{ valid: boolean; needsMigration: boolean }> {
  // Try legacy format first (scrypt)
  if (isLegacyFormat(hashed)) {
    const valid = await verifyLegacyPassword(plaintext, hashed);
    return { valid, needsMigration: valid }; // If valid with legacy, needs migration
  }

  // Try bcrypt format
  const valid = await verifyBcryptPassword(plaintext, hashed);
  return { valid, needsMigration: false }; // Bcrypt is current format
}
