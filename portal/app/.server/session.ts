import { createSessionStorage, redirect } from 'react-router';
import { env } from './env';
import crypto from 'node:crypto';
import { generateCsrfToken } from './csrf';

export type SessionUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'administrator' | 'developer';
  merchantId: number;
  merchantName: string;
};

export type SessionData = {
  pat: string;
  expiresAt: string;
  user: SessionUser;
  csrfSecret: string;
  /** Set-Cookie header string if csrfSecret was regenerated and must be committed. */
  csrfSetCookie: string | null;
};

// Encryption Helpers for PAT at rest
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(secret: string): Buffer {
  return crypto.scryptSync(secret, 'salt', 32);
}

function encrypt(text: string): string {
  const secret = env.SESSION_SECRETS[0];
  if (!secret) throw new Error("No session secret configured");
  const key = getEncryptionKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}:0`;
}

function decrypt(text: string): string | null {
  try {
    const parts = text.split(':');
    if (parts.length !== 4) return null;
    const [ivHex, authTagHex, encryptedHex, keyIndexStr] = parts as [string, string, string, string];
    const keyIndex = parseInt(keyIndexStr, 10);
    const secret = env.SESSION_SECRETS[keyIndex] || env.SESSION_SECRETS[0];
    if (!secret) return null;
    const key = getEncryptionKey(secret);
    
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8') as string;
    decrypted += decipher.final('utf8') as string;
    return decrypted;
  } catch (e) {
    return null;
  }
}

// Memory Store for dev. In prod, connect this to Redis via env.REDIS_URL
// Hoist to globalThis so the store survives HMR/dev-server reloads — otherwise
// every file edit wipes sessions and forces re-login.
const globalForStore = globalThis as typeof globalThis & {
  __sessionMemoryStore?: Map<string, { data: string; expires?: Date }>;
};
const memoryStore = globalForStore.__sessionMemoryStore ?? new Map<string, { data: string; expires?: Date }>();
globalForStore.__sessionMemoryStore = memoryStore;

export const sessionStorage = createSessionStorage<SessionData, SessionData>({
  cookie: {
    // __Host- prefix requires Secure, which browsers reject over HTTP.
    // Use a plain name in development so sessions work on http://localhost:3000.
    name: env.NODE_ENV === 'production' ? '__Host-sid' : 'sid',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    secrets: env.SESSION_SECRETS,
  },
  async createData(data, expires) {
    const id = crypto.randomUUID();
    const encrypted = encrypt(JSON.stringify(data));
    memoryStore.set(id, { data: encrypted, expires });
    return id;
  },
  async readData(id) {
    const record = memoryStore.get(id);
    if (!record) return null;
    if (record.expires && record.expires < new Date()) {
      memoryStore.delete(id);
      return null;
    }
    const decrypted = decrypt(record.data);
    return decrypted ? JSON.parse(decrypted) : null;
  },
  async updateData(id, data, expires) {
    const encrypted = encrypt(JSON.stringify(data));
    memoryStore.set(id, { data: encrypted, expires });
  },
  async deleteData(id) {
    memoryStore.delete(id);
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

export async function requireUser(request: Request): Promise<SessionData> {
  const session = await getSession(request.headers.get('Cookie'));
  const pat = session.get('pat');
  const expiresAt = session.get('expiresAt');
  const user = session.get('user');

  if (!pat || !expiresAt || !user) {
    const url = new URL(request.url);
    throw redirect(`/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
  }

  if (new Date(expiresAt) < new Date()) {
    const url = new URL(request.url);
    throw redirect(`/login?reason=expired&returnTo=${encodeURIComponent(url.pathname + url.search)}`);
  }

  let csrfSecret = session.get('csrfSecret') as string | undefined;
  let csrfSetCookie: string | null = null;

  // Heal sessions that pre-date csrfSecret being stored (e.g. after HMR or schema migration).
  if (!csrfSecret) {
    csrfSecret = generateCsrfToken();
    session.set('csrfSecret', csrfSecret);
    csrfSetCookie = await commitSession(session);
  }

  return { pat, expiresAt, user, csrfSecret, csrfSetCookie };
}

export function requireRole(user: SessionUser, role: 'administrator' | 'developer'): void {
  if (user.role !== role) {
    throw new Response('Forbidden', { status: 403 });
  }
}
