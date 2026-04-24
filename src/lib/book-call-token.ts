import { createHmac, timingSafeEqual } from "node:crypto";

export interface BookCallTokenPayload {
  e: string;
  s: string;
  i: number;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signBookCallToken(
  email: string,
  site: string,
  secret: string,
  issuedAtMs: number = Date.now(),
): string {
  const payload: BookCallTokenPayload = { e: email, s: site, i: issuedAtMs };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64urlEncode(
    createHmac("sha256", secret).update(body).digest(),
  );
  return `${body}.${sig}`;
}

export function verifyBookCallToken(
  token: string,
  secret: string,
  maxAgeMs: number = 1000 * 60 * 60 * 24 * 60,
): BookCallTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(expected, provided)) return null;
  let payload: BookCallTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.e !== "string" || typeof payload.s !== "string" || typeof payload.i !== "number") {
    return null;
  }
  if (Date.now() - payload.i > maxAgeMs) return null;
  return payload;
}
