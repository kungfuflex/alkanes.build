/**
 * Canonical signing-message format for alkanes.build.
 *
 * Every message a wallet is asked to sign on this site is built here, and
 * nowhere else. The format is:
 *
 *   alkanes.build            <- domain separator (line 1, fixed)
 *   v1                       <- version separator (line 2, fixed)
 *   action: <action>         <- action separator, from a closed set
 *   address: <address>
 *   resource: <resource>
 *   params: <canonical params>
 *   issued-at: <unix milliseconds>
 *   nonce: <32 lowercase hex characters>
 *
 * Three properties matter, and all three come from the shape above:
 *
 * 1. DOMAIN SEPARATION — line 1 is the literal string `alkanes.build`, so a
 *    signature produced for some other site can never be presented here, and a
 *    signature produced here is not a valid signature anywhere else.
 * 2. VERSION SEPARATION — line 2 pins the format. A future v2 message is a
 *    different byte string, so a v1 signature can never satisfy a v2 check.
 * 3. ACTION BINDING — `action`, `resource` and `params` name exactly what is
 *    being authorised. A signature that authorises `thread:moderate` on one
 *    discussion is a different byte string from one that authorises
 *    `builder:rotate`, or the same action on a different resource, or the same
 *    action on the same resource with different parameters. No signature can
 *    ever be replayed as a different action.
 *
 * Field values are restricted to printable ASCII with no newline (see
 * `assertFieldValue`), which is what makes the line-per-field encoding
 * unambiguous: no value can smuggle in a second field.
 *
 * SERVER RULE: the server NEVER verifies a client-supplied message string. It
 * rebuilds the message from the request's own semantic fields via
 * `buildSigningMessage` and verifies the signature against that. See
 * `lib/request-auth.ts`.
 */

export const SIGNING_DOMAIN = "alkanes.build";
export const SIGNING_VERSION = "v1";

/** The closed set of actions a signature can authorise. */
export const SIGNING_ACTIONS = {
  /** Prove control of a Bitcoin address for a forum profile. */
  PROFILE_VERIFY: "profile:verify",
  /** Change a discussion's moderation state (lock / pin / hide / title). */
  THREAD_MODERATE: "thread:moderate",
  /** Edit an existing forum post. */
  POST_EDIT: "post:edit",
  /** Soft-delete an existing forum post. */
  POST_DELETE: "post:delete",
  /** Author a forum discussion or reply. */
  FORUM_POST: "forum:post",
  /** Bind a wallet to an X account as a builder record. */
  BUILDER_REGISTER: "builder:register",
  /** Supersede the wallet on an existing builder record. */
  BUILDER_ROTATE: "builder:rotate",
  /** Cast a builder-poll vote. */
  POLL_VOTE: "poll:vote",
} as const;

export type SigningAction =
  (typeof SIGNING_ACTIONS)[keyof typeof SIGNING_ACTIONS];

const ACTION_VALUES: ReadonlySet<string> = new Set(
  Object.values(SIGNING_ACTIONS)
);

export function isSigningAction(value: unknown): value is SigningAction {
  return typeof value === "string" && ACTION_VALUES.has(value);
}

/** Maximum length of any single field value. */
export const MAX_FIELD_LENGTH = 512;

/** Printable ASCII only — in particular no CR, no LF, no control characters. */
const PRINTABLE_ASCII = /^[\x20-\x7E]*$/;

export class SigningMessageError extends Error {}

function assertFieldValue(name: string, value: string): string {
  if (typeof value !== "string") {
    throw new SigningMessageError(`${name} must be a string`);
  }
  if (value.length > MAX_FIELD_LENGTH) {
    throw new SigningMessageError(
      `${name} exceeds ${MAX_FIELD_LENGTH} characters`
    );
  }
  if (!PRINTABLE_ASCII.test(value)) {
    throw new SigningMessageError(
      `${name} must contain printable ASCII only (no newlines)`
    );
  }
  return value;
}

export type ParamValue = string | number | boolean | null | undefined;

/**
 * Canonicalise an action's parameters into a single line.
 *
 * Keys are sorted, `null`/`undefined` are dropped, and both key and value are
 * percent-encoded — so no key or value can forge a separator, and two callers
 * that mean the same thing always produce the same byte string.
 *
 * An empty parameter set canonicalises to `-`, never to the empty string, so
 * the field is always visibly present.
 */
export function canonicalParams(
  params: Record<string, ParamValue> | undefined
): string {
  if (!params) return "-";
  const parts: string[] = [];
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === null || value === undefined) continue;
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );
  }
  return parts.length > 0 ? parts.join("&") : "-";
}

const NONCE_PATTERN = /^[0-9a-f]{32}$/;

export function isValidNonce(nonce: unknown): nonce is string {
  return typeof nonce === "string" && NONCE_PATTERN.test(nonce);
}

/**
 * Generate a fresh nonce. Uses the Web Crypto API, which is present in the
 * browser, in Node 20+, and in the Next.js edge/server runtimes.
 */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface SigningMessageInput {
  action: SigningAction;
  /** The Bitcoin address that will sign. */
  address: string;
  /** What is being acted on, e.g. `discussion:clx123`. `-` when not scoped. */
  resource?: string;
  /** Parameters that fully describe the intended effect. */
  params?: Record<string, ParamValue>;
  /** Unix milliseconds. */
  issuedAt: number;
  /** 32 lowercase hex characters. */
  nonce: string;
}

/**
 * Build the exact byte string a wallet is asked to sign.
 *
 * Throws `SigningMessageError` on anything that would make the encoding
 * ambiguous, rather than silently producing a message that means something
 * other than what the caller intended.
 */
export function buildSigningMessage(input: SigningMessageInput): string {
  if (!isSigningAction(input.action)) {
    throw new SigningMessageError(`unknown action: ${String(input.action)}`);
  }
  if (!Number.isSafeInteger(input.issuedAt) || input.issuedAt <= 0) {
    throw new SigningMessageError("issued-at must be a positive integer");
  }
  if (!isValidNonce(input.nonce)) {
    throw new SigningMessageError("nonce must be 32 lowercase hex characters");
  }

  const address = assertFieldValue("address", input.address);
  if (address.length === 0) {
    throw new SigningMessageError("address must not be empty");
  }
  const resource = assertFieldValue("resource", input.resource ?? "-") || "-";
  const params = assertFieldValue("params", canonicalParams(input.params));

  return [
    SIGNING_DOMAIN,
    SIGNING_VERSION,
    `action: ${input.action}`,
    `address: ${address}`,
    `resource: ${resource}`,
    `params: ${params}`,
    `issued-at: ${input.issuedAt}`,
    `nonce: ${input.nonce}`,
  ].join("\n");
}

/**
 * Human-readable preamble shown next to the message in the UI, so a signer can
 * see what they are approving without having to read the encoding.
 */
export const ACTION_DESCRIPTIONS: Record<SigningAction, string> = {
  [SIGNING_ACTIONS.PROFILE_VERIFY]:
    "Prove you control this address, so your forum profile can show as verified.",
  [SIGNING_ACTIONS.THREAD_MODERATE]:
    "Change the moderation state of this discussion.",
  [SIGNING_ACTIONS.POST_EDIT]: "Edit this post.",
  [SIGNING_ACTIONS.POST_DELETE]: "Remove this post.",
  [SIGNING_ACTIONS.FORUM_POST]: "Publish this post under your address.",
  [SIGNING_ACTIONS.BUILDER_REGISTER]:
    "Bind this wallet to your X account as a builder record.",
  [SIGNING_ACTIONS.BUILDER_ROTATE]:
    "Replace the wallet on your builder record with this one.",
  [SIGNING_ACTIONS.POLL_VOTE]: "Cast this builder-poll vote.",
};
