import crypto from 'crypto';

const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH);
}

export function generateIV(): Buffer {
  return crypto.randomBytes(IV_LENGTH);
}

export function deriveKey(masterPassword: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterPassword, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

export function encrypt(data: string, key: Buffer): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
  const iv = generateIV();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv, authTag, ciphertext: encrypted };
}

export function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function bufferToBase64(buf: Buffer): string {
  return buf.toString('base64');
}

export function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

export function secureClear(buffer: Buffer): void {
  if (buffer && Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  }
}
