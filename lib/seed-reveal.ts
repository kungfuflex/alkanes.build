/**
 * Reveal a stored recovery phrase only against a verified password.
 *
 * The trap this exists to close: a signer that is already unlocked in memory
 * will happily export its mnemonic. `exportMnemonic()` therefore succeeds
 * whenever a wallet is connected and proves *nothing* about what the user
 * typed into the password box. A reveal gate built on "call export and see if
 * it throws" is not a gate at all — any keystroke opens it.
 *
 * The password can only be checked by attempting a real unlock, which is the
 * one operation here that fails on a wrong one. So: unlock first, and treat
 * every failure as a refusal. Export is reached only after that succeeds.
 *
 * Keeping the decision in one exported function means both the button and the
 * Enter key go through the same check, and the check can be tested without
 * standing up the terminal.
 */

export type SeedRevealResult =
  | { ok: true; mnemonic: string }
  | { ok: false; error: "empty" | "invalid" | "unavailable" };

export async function revealSeedPhrase(
  password: string,
  unlock: (password: string) => Promise<void>,
  exportMnemonic: () => string
): Promise<SeedRevealResult> {
  if (typeof password !== "string" || password === "") {
    return { ok: false, error: "empty" };
  }

  // The only step that can distinguish a right password from a wrong one.
  try {
    await unlock(password);
  } catch {
    return { ok: false, error: "invalid" };
  }

  try {
    const mnemonic = exportMnemonic();
    if (typeof mnemonic !== "string" || mnemonic === "") {
      return { ok: false, error: "unavailable" };
    }
    return { ok: true, mnemonic };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
