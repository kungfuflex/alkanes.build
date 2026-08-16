import { describe, it, expect } from "vitest";
import {
  buildSigningMessage,
  canonicalParams,
  isSigningAction,
  isValidNonce,
  newNonce,
  SIGNING_ACTIONS,
  SIGNING_DOMAIN,
  SIGNING_VERSION,
  SigningMessageError,
} from "@/lib/signing-message";

const BASE = {
  address: "bc1qexampleaddress",
  issuedAt: 1_755_000_000_000,
  nonce: "0123456789abcdef0123456789abcdef",
};

describe("buildSigningMessage", () => {
  it("produces the documented shape", () => {
    const message = buildSigningMessage({
      ...BASE,
      action: SIGNING_ACTIONS.PROFILE_VERIFY,
      resource: `address:${BASE.address}`,
    });

    expect(message).toBe(
      [
        "alkanes.build",
        "v1",
        "action: profile:verify",
        "address: bc1qexampleaddress",
        "resource: address:bc1qexampleaddress",
        "params: -",
        "issued-at: 1755000000000",
        "nonce: 0123456789abcdef0123456789abcdef",
      ].join("\n")
    );
  });

  it("opens with the domain and version separators", () => {
    const [domain, version] = buildSigningMessage({
      ...BASE,
      action: SIGNING_ACTIONS.POLL_VOTE,
    }).split("\n");

    expect(domain).toBe(SIGNING_DOMAIN);
    expect(version).toBe(SIGNING_VERSION);
  });

  describe("separation properties", () => {
    const message = (over: Record<string, unknown>) =>
      buildSigningMessage({
        ...BASE,
        action: SIGNING_ACTIONS.BUILDER_REGISTER,
        resource: "x:1",
        ...over,
      } as any);

    it("differs for every action", () => {
      const all = Object.values(SIGNING_ACTIONS).map((action) =>
        message({ action })
      );
      expect(new Set(all).size).toBe(all.length);
    });

    it("differs for a different resource", () => {
      expect(message({ resource: "x:1" })).not.toBe(
        message({ resource: "x:2" })
      );
    });

    it("differs for a different parameter set", () => {
      expect(message({ params: { a: 1 } })).not.toBe(
        message({ params: { a: 2 } })
      );
      expect(message({ params: { a: 1 } })).not.toBe(
        message({ params: { a: 1, b: 1 } })
      );
    });

    it("differs for a different address, timestamp or nonce", () => {
      expect(message({ address: "bc1qother" })).not.toBe(message({}));
      expect(message({ issuedAt: BASE.issuedAt + 1 })).not.toBe(message({}));
      expect(message({ nonce: "f".repeat(32) })).not.toBe(message({}));
    });

    it("is stable for the same inputs, whatever the key order", () => {
      expect(message({ params: { b: 2, a: 1 } })).toBe(
        message({ params: { a: 1, b: 2 } })
      );
    });
  });

  describe("rejects anything that would make the encoding ambiguous", () => {
    it("rejects a newline in a field, so no value can forge another field", () => {
      expect(() =>
        buildSigningMessage({
          ...BASE,
          action: SIGNING_ACTIONS.PROFILE_VERIFY,
          address: "bc1qx\naction: builder:register",
        })
      ).toThrow(SigningMessageError);

      expect(() =>
        buildSigningMessage({
          ...BASE,
          action: SIGNING_ACTIONS.PROFILE_VERIFY,
          resource: "a\nb",
        })
      ).toThrow(SigningMessageError);
    });

    it("rejects non-printable and non-ASCII field values", () => {
      for (const address of ["bc1q\u0000x", "bc1q​x", "bc1q☃"]) {
        expect(() =>
          buildSigningMessage({
            ...BASE,
            action: SIGNING_ACTIONS.PROFILE_VERIFY,
            address,
          })
        ).toThrow(SigningMessageError);
      }
    });

    it("rejects an over-long field", () => {
      expect(() =>
        buildSigningMessage({
          ...BASE,
          action: SIGNING_ACTIONS.PROFILE_VERIFY,
          resource: "x".repeat(513),
        })
      ).toThrow(SigningMessageError);
    });

    it("rejects an unknown action", () => {
      expect(() =>
        buildSigningMessage({
          ...BASE,
          action: "not:an:action" as any,
        })
      ).toThrow(SigningMessageError);
    });

    it("rejects a malformed nonce", () => {
      for (const nonce of ["", "short", "g".repeat(32), "A".repeat(32), "0".repeat(33)]) {
        expect(() =>
          buildSigningMessage({
            ...BASE,
            action: SIGNING_ACTIONS.PROFILE_VERIFY,
            nonce,
          })
        ).toThrow(SigningMessageError);
      }
    });

    it("rejects a non-integer or non-positive timestamp", () => {
      for (const issuedAt of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2]) {
        expect(() =>
          buildSigningMessage({
            ...BASE,
            action: SIGNING_ACTIONS.PROFILE_VERIFY,
            issuedAt,
          })
        ).toThrow(SigningMessageError);
      }
    });

    it("rejects an empty address", () => {
      expect(() =>
        buildSigningMessage({
          ...BASE,
          action: SIGNING_ACTIONS.PROFILE_VERIFY,
          address: "",
        })
      ).toThrow(SigningMessageError);
    });
  });
});

describe("canonicalParams", () => {
  it("sorts keys and drops empties", () => {
    expect(canonicalParams({ b: 2, a: 1, c: null, d: undefined })).toBe(
      "a=1&b=2"
    );
  });

  it("renders an empty set as a visible placeholder", () => {
    expect(canonicalParams({})).toBe("-");
    expect(canonicalParams(undefined)).toBe("-");
    expect(canonicalParams({ a: null })).toBe("-");
  });

  it("encodes separators so a value cannot forge a parameter", () => {
    expect(canonicalParams({ a: "1&b=2" })).toBe("a=1%26b%3D2");
    expect(canonicalParams({ "a&b": "1" })).toBe("a%26b=1");
    expect(canonicalParams({ a: "x\ny" })).toBe("a=x%0Ay");
  });

  it("distinguishes a value from an encoded one", () => {
    expect(canonicalParams({ a: "1&b=2" })).not.toBe(
      canonicalParams({ a: "1", b: "2" })
    );
  });

  it("renders booleans and numbers unambiguously", () => {
    expect(canonicalParams({ isLocked: true, n: 0 })).toBe("isLocked=true&n=0");
  });
});

describe("nonces", () => {
  it("generates nonces of the required shape", () => {
    for (let i = 0; i < 32; i++) {
      expect(isValidNonce(newNonce())).toBe(true);
    }
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 256 }, () => newNonce()));
    expect(seen.size).toBe(256);
  });

  it("validates shape strictly", () => {
    expect(isValidNonce("0".repeat(32))).toBe(true);
    expect(isValidNonce("0".repeat(31))).toBe(false);
    expect(isValidNonce("A".repeat(32))).toBe(false);
    expect(isValidNonce(undefined)).toBe(false);
    expect(isValidNonce(12345)).toBe(false);
  });
});

describe("isSigningAction", () => {
  it("accepts exactly the closed set", () => {
    for (const action of Object.values(SIGNING_ACTIONS)) {
      expect(isSigningAction(action)).toBe(true);
    }
    for (const bad of ["", "profile", "profile:verify ", "admin:everything", null, 1]) {
      expect(isSigningAction(bad)).toBe(false);
    }
  });
});
