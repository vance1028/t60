const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input: string): Uint8Array {
  let cleaned = input.toUpperCase().replace(/[\s=-]+/g, '');
  cleaned = cleaned.replace(/0/g, 'O');

  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_CHARS.indexOf(cleaned[i]);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

function uint64ToBytes(value: number): Uint8Array {
  const result = new Uint8Array(8);
  const high = Math.floor(value / 0x100000000);
  const low = value & 0xffffffff;
  result[0] = (high >>> 24) & 0xff;
  result[1] = (high >>> 16) & 0xff;
  result[2] = (high >>> 8) & 0xff;
  result[3] = high & 0xff;
  result[4] = (low >>> 24) & 0xff;
  result[5] = (low >>> 16) & 0xff;
  result[6] = (low >>> 8) & 0xff;
  result[7] = low & 0xff;
  return result;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const keyBuffer = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
  const msgBuffer = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
  return new Uint8Array(signature);
}

export async function generateTOTP(
  secret: string,
  period: number = 30,
  digits: number = 6
): Promise<string> {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / period);
  const counterBytes = uint64ToBytes(counter);

  const hmacResult = await hmacSha1(key, counterBytes);

  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

export function getTimeRemaining(period: number = 30): number {
  const epoch = Math.floor(Date.now() / 1000);
  return period - (epoch % period);
}

export function getProgress(period: number = 30): number {
  const remaining = getTimeRemaining(period);
  return remaining / period;
}

export interface TOTPParams {
  secret: string;
  period: number;
  digits: number;
  issuer?: string;
  account?: string;
}

export function parseOtpauthUri(uri: string): TOTPParams | null {
  try {
    if (!uri.startsWith('otpauth://totp/')) return null;

    const url = new URL(uri);
    const params = url.searchParams;

    const secret = params.get('secret');
    if (!secret) return null;

    const period = params.get('period');
    const digits = params.get('digits');
    const issuer = params.get('issuer');

    const pathPart = decodeURIComponent(url.pathname.replace('//', ''));
    let account = pathPart;
    if (issuer && pathPart.startsWith(issuer + ':')) {
      account = pathPart.substring(issuer.length + 1).trim();
    }

    return {
      secret: secret.toUpperCase(),
      period: period ? parseInt(period, 10) : 30,
      digits: digits ? parseInt(digits, 10) : 6,
      issuer: issuer || undefined,
      account: account || undefined,
    };
  } catch {
    return null;
  }
}
