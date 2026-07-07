import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64');
}

export function hashPlainToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateOpaqueToken() {
  return base64UrlEncode(randomBytes(48));
}

export function generateNumericOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = (10 ** length) - 1;
  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(value);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, derivedHash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !derivedHash) {
    return false;
  }

  const calculated = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(derivedHash, 'hex'));
}

export function signAccessToken(
  payload: Record<string, unknown>,
  secret: string,
) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest(),
  );

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyAccessToken<T extends Record<string, unknown>>(token: string, secret: string) {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Malformed token.');
  }

  const expectedSignature = base64UrlEncode(
    createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest(),
  );

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid signature.');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as T;
  return payload;
}
