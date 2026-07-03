import { cookies } from 'next/headers';

const SECRET = process.env.SESSION_SECRET || 'super-secret-key-dashboard-monitoring-12345';

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return arrayBufferToHex(signature);
}

export interface SessionData {
  userId: number;
  name: string;
  email: string;
  role: string;
}

export async function setSession(data: SessionData) {
  const serialized = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(serialized)));
  const signature = await sign(base64);
  const token = `${base64}.${signature}`;
  
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) return null;

    const [base64, signature] = sessionCookie.value.split('.');
    if (!base64 || !signature) return null;

    const expectedSignature = await sign(base64);
    if (signature !== expectedSignature) {
      return null;
    }

    const serialized = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(serialized) as SessionData;
  } catch (error) {
    return null;
  }
}

export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const [base64, signature] = token.split('.');
    if (!base64 || !signature) return null;

    const expectedSignature = await sign(base64);
    if (signature !== expectedSignature) return null;

    const serialized = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(serialized) as SessionData;
  } catch (error) {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
