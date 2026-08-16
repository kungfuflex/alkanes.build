/**
 * Server-side verification of a signed action.
 *
 * The rule this module exists to enforce: **the server never verifies a
 * client-supplied message string.** It rebuilds the canonical message from the
 * request's own semantic fields (`lib/signing-message.ts`) and verifies the
 * signature against that. A client that sends a message saying one thing and
 * parameters saying another is rejected, because the message it signed is not
 * the message the server checks.
 *
 * The signature itself is checked by `verifyMessageSignature` in
 * `lib/bip322.ts` — the repository's real BIP-322 verifier — and deliberately
 * *without* a caller-supplied public key. See the note in that file: a public
 * key that the caller chooses and that is not bound to the claimed address is
 * an authentication bypass, so this module never offers one.
 */

import { validate } from "bitcoin-address-validation";
import { verifyMessageSignature } from "@/lib/bip322";
import {
  buildSigningMessage,
  isValidNonce,
  SigningMessageError,
  type ParamValue,
  type SigningAction,
} from "@/lib/signing-message";

/** How long a signed action stays valid after it was issued. */
export const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/** Tolerance for a client clock that runs ahead of the server. */
export const SIGNATURE_MAX_FUTURE_SKEW_MS = 60 * 1000;

export type SignedActionSuccess = {
  ok: true;
  /** The exact message the signature was checked against. */
  message: string;
};

export type SignedActionFailure = {
  ok: false;
  status: number;
  error: string;
};

export type SignedActionResult = SignedActionSuccess | SignedActionFailure;

export type BitcoinNetwork = "mainnet" | "testnet" | "regtest";

/**
 * Which network an address belongs to, read from its human-readable prefix.
 *
 * Derived from the address rather than from configuration: it is the address
 * that determines how the signature must be checked, and taking it from the
 * request would let a caller choose the verification path.
 *
 * Returns null for address forms the BIP-322 verifier does not support
 * (legacy base58, and regtest `bcrt1...`).
 */
export function networkForAddress(address: string): BitcoinNetwork | null {
  if (/^bc1[qp]/.test(address)) return "mainnet";
  if (/^tb1[qp]/.test(address)) return "testnet";
  return null;
}

/**
 * Does this request present *any* credential at all?
 *
 * Checked before the resource is looked up, so an unauthenticated caller
 * cannot use a 404-versus-403 difference to enumerate which discussions or
 * posts exist.
 */
export function presentsSignedCredentials(credentials: {
  address?: unknown;
  signature?: unknown;
}): boolean {
  return (
    typeof credentials.address === "string" &&
    credentials.address !== "" &&
    typeof credentials.signature === "string" &&
    credentials.signature !== ""
  );
}

export interface SignedActionInput {
  action: SigningAction;
  /** Address claimed by the caller. */
  address: unknown;
  /** Base64 BIP-322 signature. */
  signature: unknown;
  /** Unix milliseconds, as sent by the caller. */
  issuedAt: unknown;
  /** 32 lowercase hex characters. */
  nonce: unknown;
  /** What is being acted on. */
  resource?: string;
  /** Parameters that fully describe the intended effect. */
  params?: Record<string, ParamValue>;
  /** Overridable for tests. */
  now?: number;
}

function toMillis(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Verify that `signature` is a valid signature by `address` over the canonical
 * message for this action, resource and parameter set, and that it is fresh.
 */
export async function verifySignedAction(
  input: SignedActionInput
): Promise<SignedActionResult> {
  const { address, signature, nonce } = input;

  if (typeof address !== "string" || address === "") {
    return { ok: false, status: 400, error: "Missing required field: address" };
  }
  if (typeof signature !== "string" || signature === "") {
    return {
      ok: false,
      status: 400,
      error: "Missing required field: signature",
    };
  }
  if (!isValidNonce(nonce)) {
    return {
      ok: false,
      status: 400,
      error: "Missing or malformed field: nonce",
    };
  }

  const issuedAt = toMillis(input.issuedAt);
  if (issuedAt === null) {
    return {
      ok: false,
      status: 400,
      error: "Missing or malformed field: issuedAt",
    };
  }

  if (!validate(address)) {
    return { ok: false, status: 400, error: "Invalid Bitcoin address" };
  }

  const network = networkForAddress(address);
  if (network === null) {
    return {
      ok: false,
      status: 400,
      error:
        "Unsupported address type. Use a native SegWit (bc1q/tb1q) or Taproot (bc1p/tb1p) address.",
    };
  }

  const now = input.now ?? Date.now();
  if (issuedAt - now > SIGNATURE_MAX_FUTURE_SKEW_MS) {
    return { ok: false, status: 400, error: "Signature is dated in the future" };
  }
  if (now - issuedAt > SIGNATURE_MAX_AGE_MS) {
    return {
      ok: false,
      status: 400,
      error: "Signature has expired. Please sign again.",
    };
  }

  let message: string;
  try {
    message = buildSigningMessage({
      action: input.action,
      address,
      resource: input.resource,
      params: input.params,
      issuedAt,
      nonce,
    });
  } catch (error) {
    if (error instanceof SigningMessageError) {
      return { ok: false, status: 400, error: error.message };
    }
    throw error;
  }

  let valid = false;
  try {
    // No public key argument, by design — see the module comment.
    valid = await verifyMessageSignature(message, address, signature, network);
  } catch (error) {
    console.error("[auth] signature verification threw:", error);
    valid = false;
  }

  if (!valid) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }

  return { ok: true, message };
}
