import { env } from '../config/env';

// Helper to encode to base64url
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Helper to decode from base64url
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// HMAC-SHA256 signing using Bun/Web Crypto
async function signHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureBytes = new Uint8Array(signature);
  
  // Convert binary to string for btoa
  let binary = '';
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  
  return base64UrlEncode(binary);
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

export async function signJWT(payload: JWTPayload, secret: string, expiresIn: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const iat = Math.floor(Date.now() / 1000);
  let exp = iat;
  
  // Simple duration parser: e.g. "15m", "7d"
  const num = parseInt(expiresIn);
  const unit = expiresIn.slice(-1);
  if (unit === 'm') exp += num * 60;
  else if (unit === 'h') exp += num * 3600;
  else if (unit === 'd') exp += num * 86400;
  else exp += 3600; // default 1h
  
  const fullPayload = { ...payload, iat, exp };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHMAC(message, secret);
  
  return `${message}.${signature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;
    
    const expectedSignature = await signHMAC(message, secret);
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}
