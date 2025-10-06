import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;

export function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Senha inválida");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  try {
    const derived = scryptSync(password, salt, KEYLEN);
    const expected = Buffer.from(hash, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
