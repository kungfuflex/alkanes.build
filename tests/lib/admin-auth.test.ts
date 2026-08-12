import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ADMIN_TOKEN_ENV,
  hasAdminCredentials,
  isAdminConfigured,
  MIN_ADMIN_TOKEN_LENGTH,
  presentsAdminCredentials,
  requireAdmin,
} from "@/lib/admin-auth";

const TOKEN = "0123456789abcdef0123456789abcdef0123";

function req(authorization?: string) {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return { headers };
}

const original = process.env[ADMIN_TOKEN_ENV];

beforeEach(() => {
  process.env[ADMIN_TOKEN_ENV] = TOKEN;
});

afterEach(() => {
  if (original === undefined) delete process.env[ADMIN_TOKEN_ENV];
  else process.env[ADMIN_TOKEN_ENV] = original;
});

describe("requireAdmin", () => {
  it("accepts the configured token", () => {
    expect(requireAdmin(req(`Bearer ${TOKEN}`))).toEqual({ ok: true });
  });

  it("accepts a case-insensitive scheme and surrounding whitespace", () => {
    expect(requireAdmin(req(`bearer ${TOKEN}`)).ok).toBe(true);
    expect(requireAdmin(req(`  BEARER   ${TOKEN}  `)).ok).toBe(true);
  });

  it("rejects a missing header with 401", () => {
    const result = requireAdmin(req());
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Administrative authentication required",
    });
  });

  it("rejects a non-Bearer scheme with 401", () => {
    expect(requireAdmin(req(`Basic ${TOKEN}`)).ok).toBe(false);
    expect((requireAdmin(req(`Basic ${TOKEN}`)) as any).status).toBe(401);
    expect((requireAdmin(req("Bearer")) as any).status).toBe(401);
    expect((requireAdmin(req("Bearer ")) as any).status).toBe(401);
  });

  it("rejects a wrong token with 403", () => {
    for (const wrong of [
      "x".repeat(36),
      TOKEN.slice(0, -1),
      `${TOKEN}x`,
      TOKEN.toUpperCase(),
    ]) {
      const result = requireAdmin(req(`Bearer ${wrong}`));
      expect(result.ok, wrong).toBe(false);
      expect((result as any).status).toBe(403);
    }
  });

  it("fails closed when no token is configured", () => {
    delete process.env[ADMIN_TOKEN_ENV];

    const result = requireAdmin(req(`Bearer ${TOKEN}`));
    expect(result.ok).toBe(false);
    expect((result as any).status).toBe(503);
    expect(isAdminConfigured()).toBe(false);
  });

  it("treats an empty or short configured token as absent", () => {
    for (const weak of ["", "hunter2", "x".repeat(MIN_ADMIN_TOKEN_LENGTH - 1)]) {
      process.env[ADMIN_TOKEN_ENV] = weak;
      expect(isAdminConfigured()).toBe(false);
      const result = requireAdmin(req(`Bearer ${weak}`));
      expect(result.ok).toBe(false);
      expect((result as any).status).toBe(503);
    }
  });

  it("never throws on a length mismatch (digests are compared, not raw bytes)", () => {
    expect(() => requireAdmin(req("Bearer a"))).not.toThrow();
    expect(() => requireAdmin(req(`Bearer ${"a".repeat(10_000)}`))).not.toThrow();
  });
});

describe("hasAdminCredentials / presentsAdminCredentials", () => {
  it("distinguishes 'no credential' from 'wrong credential'", () => {
    expect(hasAdminCredentials(req())).toBe(false);
    expect(presentsAdminCredentials(req())).toBe(false);

    expect(hasAdminCredentials(req(`Bearer ${"z".repeat(36)}`))).toBe(false);
    expect(presentsAdminCredentials(req(`Bearer ${"z".repeat(36)}`))).toBe(true);

    expect(hasAdminCredentials(req(`Bearer ${TOKEN}`))).toBe(true);
    expect(presentsAdminCredentials(req(`Bearer ${TOKEN}`))).toBe(true);
  });
});
