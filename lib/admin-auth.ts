/**
 * Minimal operator-credential check for the site's administrative routes.
 *
 * This codebase has no user, account, session or credential model — identity
 * everywhere is a bare Bitcoin address string, and nothing in the schema
 * expresses "is a moderator". Rather than invent a session model, the
 * administrative surface is gated on a single deployment-held bearer token.
 *
 * Properties that matter:
 *   - FAIL CLOSED. With `FORUM_ADMIN_TOKEN` unset the routes are unavailable,
 *     not open. A deployment that forgets to set it loses the seed endpoint;
 *     it does not expose it.
 *   - NO WEAK TOKENS. A token shorter than 32 characters is treated as absent,
 *     so the gate cannot be satisfied by a guessable value.
 *   - CONSTANT TIME. Presented and configured tokens are compared as SHA-256
 *     digests with `timingSafeEqual`, so neither the length nor any prefix of
 *     the configured token leaks through response timing.
 */

import { createHash, timingSafeEqual } from "crypto";

/** Name of the environment variable holding the operator token. */
export const ADMIN_TOKEN_ENV = "FORUM_ADMIN_TOKEN";

/** Shortest token this module will accept as configured. */
export const MIN_ADMIN_TOKEN_LENGTH = 32;

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** True when this deployment has a usable operator token configured. */
export function isAdminConfigured(): boolean {
  const configured = process.env[ADMIN_TOKEN_ENV];
  return (
    typeof configured === "string" &&
    configured.length >= MIN_ADMIN_TOKEN_LENGTH
  );
}

/**
 * Check an incoming request's `Authorization: Bearer <token>` header against
 * the configured operator token.
 *
 * Returns `{ ok: true }` only on an exact match.
 */
export function requireAdmin(request: {
  headers: { get(name: string): string | null };
}): AdminAuthResult {
  const configured = process.env[ADMIN_TOKEN_ENV];

  if (
    typeof configured !== "string" ||
    configured.length < MIN_ADMIN_TOKEN_LENGTH
  ) {
    return {
      ok: false,
      status: 503,
      error: "Administrative endpoints are not configured on this deployment",
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S.*)$/i.exec(header.trim());
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: "Administrative authentication required",
    };
  }

  if (!timingSafeEqual(digest(match[1].trim()), digest(configured))) {
    return { ok: false, status: 403, error: "Invalid administrative credentials" };
  }

  return { ok: true };
}

/**
 * True when the request carries valid operator credentials. Used where an
 * operator token is one of several acceptable ways to authorise an action.
 */
export function hasAdminCredentials(request: {
  headers: { get(name: string): string | null };
}): boolean {
  return requireAdmin(request).ok;
}

/**
 * True when the request presents *some* administrative credential, valid or
 * not. Lets a caller answer 403 ("your credential is wrong") rather than 401
 * ("you presented none"), without leaking whether the token was close.
 */
export function presentsAdminCredentials(request: {
  headers: { get(name: string): string | null };
}): boolean {
  const header = request.headers.get("authorization") ?? "";
  return /^Bearer\s+\S/i.test(header.trim());
}
