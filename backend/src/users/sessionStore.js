import { randomUUID } from "crypto";

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const sessions = new Map();

export function createSession(userId, ttlMs = DEFAULT_TTL_MS) {
  const token = randomUUID();
  const expiresAt = Date.now() + ttlMs;
  sessions.set(token, { userId, expiresAt });
  return { token, expiresAt };
}

export function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function revokeSession(token) {
  if (token) sessions.delete(token);
}

export function purgeExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}
