/**
 * Finding 6 — the recovery phrase was revealed without checking the password.
 *
 * The terminal's BACKUP SEED box had two ways in. The REVEAL button verified
 * the password by attempting an unlock. The Enter key did not: it discarded
 * what the user typed and called `wallet.exportMnemonic()` directly. That reads
 * the signer already unlocked in memory, so it succeeds whenever a wallet is
 * connected — any single keystroke plus Enter printed the plaintext seed phrase
 * into the DOM, next to a Copy button.
 *
 * Both paths now go through `revealSeedPhrase`, which cannot return a mnemonic
 * unless `unlock(password)` resolved first.
 */

import { describe, it, expect, vi } from "vitest";
import { revealSeedPhrase } from "@/lib/seed-reveal";

const MNEMONIC = "abandon ".repeat(11) + "about";
const CORRECT = "correct horse battery staple";

/** An unlock that only accepts the right password, as a keystore does. */
const unlockWith = (accepted: string) =>
  vi.fn(async (password: string) => {
    if (password !== accepted) throw new Error("Invalid password");
  });

const exportOk = () => vi.fn(() => MNEMONIC);

describe("revealSeedPhrase — negative controls", () => {
  it("refuses a wrong password and never calls export", async () => {
    const unlock = unlockWith(CORRECT);
    const exportMnemonic = exportOk();

    const result = await revealSeedPhrase("wrong", unlock, exportMnemonic);

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(exportMnemonic).not.toHaveBeenCalled();
  });

  it("reproduces the exact pre-fix condition: an unlocked signer is not authorisation", async () => {
    // The signer exports happily — that was the whole bug. The gate must still
    // refuse, because the password was never verified.
    const unlock = unlockWith(CORRECT);
    const exportMnemonic = vi.fn(() => MNEMONIC);

    for (const keystroke of ["a", "x", "1", " ", "not-the-password"]) {
      const result = await revealSeedPhrase(keystroke, unlock, exportMnemonic);
      expect(result.ok, keystroke).toBe(false);
    }
    expect(exportMnemonic).not.toHaveBeenCalled();
  });

  it("refuses an empty password without touching the keystore at all", async () => {
    const unlock = unlockWith(CORRECT);
    const exportMnemonic = exportOk();

    const result = await revealSeedPhrase("", unlock, exportMnemonic);

    expect(result).toEqual({ ok: false, error: "empty" });
    expect(unlock).not.toHaveBeenCalled();
    expect(exportMnemonic).not.toHaveBeenCalled();
  });

  it("refuses a non-string password", async () => {
    const unlock = unlockWith(CORRECT);
    const exportMnemonic = exportOk();

    for (const bad of [undefined, null, 0, {}, []] as unknown as string[]) {
      const result = await revealSeedPhrase(bad, unlock, exportMnemonic);
      expect(result).toEqual({ ok: false, error: "empty" });
    }
    expect(exportMnemonic).not.toHaveBeenCalled();
  });

  it("never leaks the phrase through a thrown export", async () => {
    const unlock = unlockWith(CORRECT);
    const exportMnemonic = vi.fn(() => {
      throw new Error("keystore gone");
    });

    const result = await revealSeedPhrase(CORRECT, unlock, exportMnemonic);

    expect(result).toEqual({ ok: false, error: "unavailable" });
  });

  it("treats an empty export as unavailable rather than reporting success", async () => {
    const unlock = unlockWith(CORRECT);
    const result = await revealSeedPhrase(CORRECT, unlock, () => "");

    expect(result).toEqual({ ok: false, error: "unavailable" });
  });

  it("verifies before exporting, in that order", async () => {
    const order: string[] = [];
    const unlock = vi.fn(async () => {
      order.push("unlock");
    });
    const exportMnemonic = vi.fn(() => {
      order.push("export");
      return MNEMONIC;
    });

    await revealSeedPhrase(CORRECT, unlock, exportMnemonic);

    expect(order).toEqual(["unlock", "export"]);
  });
});

describe("revealSeedPhrase — positive controls", () => {
  it("reveals the phrase for the correct password", async () => {
    const unlock = unlockWith(CORRECT);
    const exportMnemonic = exportOk();

    const result = await revealSeedPhrase(CORRECT, unlock, exportMnemonic);

    expect(result).toEqual({ ok: true, mnemonic: MNEMONIC });
    expect(unlock).toHaveBeenCalledWith(CORRECT);
    expect(exportMnemonic).toHaveBeenCalledOnce();
  });

  it("still works after a failed attempt", async () => {
    const unlock = unlockWith(CORRECT);
    const exportMnemonic = exportOk();

    expect((await revealSeedPhrase("wrong", unlock, exportMnemonic)).ok).toBe(false);
    expect((await revealSeedPhrase(CORRECT, unlock, exportMnemonic)).ok).toBe(true);
  });

  it("passes the password through unmodified", async () => {
    const awkward = "  pässwörd with spaces & symbols <>&  ";
    const unlock = unlockWith(awkward);

    const result = await revealSeedPhrase(awkward, unlock, exportOk());

    expect(result.ok).toBe(true);
    expect(unlock).toHaveBeenCalledWith(awkward);
  });
});
