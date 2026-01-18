import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

let encryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (encryptionKey) return encryptionKey;
  
  const keyString = process.env.USER_DATA_ENCRYPTION_KEY;
  if (!keyString) {
    throw new Error('USER_DATA_ENCRYPTION_KEY environment variable is not set');
  }
  
  const salt = Buffer.from('spelling-playground-salt', 'utf8');
  encryptionKey = scryptSync(keyString, salt, KEY_LENGTH);
  return encryptionKey;
}

export function hashForLookup(value: string): string {
  if (!value) return value;
  const keyString = process.env.USER_DATA_ENCRYPTION_KEY || 'default-key';
  return createHash('sha256').update(value.toLowerCase() + keyString).digest('hex');
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  
  if (!ciphertext.includes(':')) {
    return ciphertext;
  }
  
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    
    if (parts.length !== 3) {
      return ciphertext;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed, returning original value:', error);
    return ciphertext;
  }
}

export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3 && 
         parts[0].length === IV_LENGTH * 2 && 
         parts[1].length === AUTH_TAG_LENGTH * 2;
}

export const PII_FIELDS = ['firstName', 'lastName', 'email'] as const;
export type PIIField = typeof PII_FIELDS[number];

export function encryptUserPII<T extends Record<string, any>>(user: T): T {
  const encrypted: Record<string, any> = { ...user };
  for (const field of PII_FIELDS) {
    if (field in encrypted && encrypted[field] && typeof encrypted[field] === 'string') {
      if (!isEncrypted(encrypted[field])) {
        encrypted[field] = encrypt(encrypted[field]);
      }
    }
  }
  return encrypted as T;
}

export function decryptUserPII<T extends Record<string, any>>(user: T): T {
  const decrypted: Record<string, any> = { ...user };
  for (const field of PII_FIELDS) {
    if (field in decrypted && decrypted[field] && typeof decrypted[field] === 'string') {
      if (isEncrypted(decrypted[field])) {
        decrypted[field] = decrypt(decrypted[field]);
      }
    }
  }
  return decrypted as T;
}

export function hasEncryptionKey(): boolean {
  return !!process.env.USER_DATA_ENCRYPTION_KEY;
}
