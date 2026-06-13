/**
 * Server-side session token management.
 *
 * Generates and verifies HMAC-SHA256 signed session tokens so that
 * the server never trusts client-sent role/email/id headers.
 *
 * Token format:  base64url(payload).base64url(signature)
 * Payload:       JSON { id, email, role, iat, exp }
 *
 * The signing secret is derived from SUPABASE_SERVICE_ROLE_KEY which
 * is already a server-only secret that never reaches the frontend.
 */
import crypto from "crypto";

interface SessionPayload {
  id: string;
  email: string;
  role: string;
  name: string;
  iat: number; // issued-at (epoch seconds)
  exp: number; // expiration (epoch seconds)
}

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function getSigningSecret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for session signing");
  }
  // Derive a dedicated signing key so we don't use the raw Supabase key directly
  return crypto.createHash("sha256").update(`session-sign:${key}`).digest("hex");
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(encoded: string): string {
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  return Buffer.from(base64, "base64").toString("utf-8");
}

function sign(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Creates a signed session token for the authenticated user.
 * Called after successful login verification.
 */
export function createSessionToken(user: {
  id: string;
  email: string;
  role: string;
  name: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadStr);
  const secret = getSigningSecret();
  const signature = sign(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a session token and returns the payload if valid.
 * Returns null if the token is invalid, expired, or tampered.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSignature] = parts;

  try {
    const secret = getSigningSecret();
    const expectedSignature = sign(encodedPayload, secret);

    // Constant-time comparison to prevent timing attacks
    if (
      providedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null;
    }

    const payloadStr = base64UrlDecode(encodedPayload);
    const payload: SessionPayload = JSON.parse(payloadStr);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    // Validate required fields
    if (!payload.id || !payload.email || !payload.role) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
