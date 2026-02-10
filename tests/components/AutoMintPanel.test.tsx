import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { AutoMintPanel } from "@/components/AutoMintPanel";

// Default props for a connected wallet with fee in range
function makeProps(overrides: Record<string, any> = {}) {
  return {
    currentFeeRate: 0.5,
    currentEffectiveRate: 0,
    hasActiveChain: false,
    chainLength: 0,
    chainsCount: 0,
    totalChainsTx: 0,
    isConnected: true,
    isMinting: false,
    isRbfing: false,
    blockReward: 3.125,
    dieselPrice: 3000,
    competition: 100,
    sessionSpent: 0,
    onResetSpent: vi.fn(),
    onMint: vi.fn().mockResolvedValue(undefined),
    onRbf: vi.fn().mockResolvedValue(undefined),
    onCpfp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("AutoMintPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when not connected", () => {
    const { container } = render(<AutoMintPanel {...makeProps({ isConnected: false })} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the panel when connected", () => {
    render(<AutoMintPanel {...makeProps()} />);
    expect(screen.getByText("AUTO-MINT")).toBeInTheDocument();
    expect(screen.getByText("START")).toBeInTheDocument();
  });

  it("toggles enabled state on START/STOP click", () => {
    render(<AutoMintPanel {...makeProps()} />);
    const btn = screen.getByText("START");
    fireEvent.click(btn);
    expect(screen.getByText("STOP")).toBeInTheDocument();
    fireEvent.click(screen.getByText("STOP"));
    expect(screen.getByText("START")).toBeInTheDocument();
  });

  describe("auto-mint trigger", () => {
    it("does not trigger while minting", async () => {
      const onMint = vi.fn().mockResolvedValue(undefined);
      render(<AutoMintPanel {...makeProps({ onMint, isMinting: true })} />);
      fireEvent.click(screen.getByText("START"));
      await act(async () => { vi.advanceTimersByTime(100); });
      expect(onMint).not.toHaveBeenCalled();
    });

    it("does not trigger while RBFing", async () => {
      const onMint = vi.fn().mockResolvedValue(undefined);
      render(<AutoMintPanel {...makeProps({ onMint, isRbfing: true })} />);
      fireEvent.click(screen.getByText("START"));
      await act(async () => { vi.advanceTimersByTime(100); });
      expect(onMint).not.toHaveBeenCalled();
    });

    it("does not trigger when has active chain", async () => {
      const onMint = vi.fn().mockResolvedValue(undefined);
      render(
        <AutoMintPanel
          {...makeProps({
            onMint,
            hasActiveChain: true,
            chainLength: 10,
            chainsCount: 1,
            totalChainsTx: 10,
            currentEffectiveRate: 0.5,
          })}
        />
      );
      fireEvent.click(screen.getByText("START"));
      await act(async () => { vi.advanceTimersByTime(100); });
      expect(onMint).not.toHaveBeenCalled();
    });
  });

  describe("chain confirmed → new cycle (waitingForFreshFees)", () => {
    it("detects chain confirmation (hasActiveChain: true → false)", async () => {
      const props = makeProps({
        hasActiveChain: true,
        chainLength: 10,
        chainsCount: 1,
        totalChainsTx: 10,
        currentFeeRate: 0.5,
        currentEffectiveRate: 0.5,
      });
      const { rerender } = render(<AutoMintPanel {...props} />);
      fireEvent.click(screen.getByText("START"));

      // Chain confirmed - hasActiveChain transitions to false
      await act(async () => {
        rerender(
          <AutoMintPanel
            {...makeProps({
              hasActiveChain: false,
              chainLength: 0,
              chainsCount: 0,
              totalChainsTx: 0,
              currentFeeRate: 0.5,
              currentEffectiveRate: 0,
            })}
          />
        );
      });

      expect(screen.getByText(/CONFIRMED/)).toBeInTheDocument();
    });

    it("unblocks after fresh fee data arrives (fee rate changes)", async () => {
      const props = makeProps({
        hasActiveChain: true,
        chainLength: 10,
        chainsCount: 1,
        totalChainsTx: 10,
        currentFeeRate: 0.5,
        currentEffectiveRate: 0.5,
      });
      const { rerender } = render(<AutoMintPanel {...props} />);
      fireEvent.click(screen.getByText("START"));

      // Chain confirmed
      await act(async () => {
        rerender(
          <AutoMintPanel
            {...makeProps({
              hasActiveChain: false,
              chainLength: 0,
              chainsCount: 0,
              totalChainsTx: 0,
              currentFeeRate: 0.5,
              currentEffectiveRate: 0,
            })}
          />
        );
      });
      expect(screen.getByText(/CONFIRMED/)).toBeInTheDocument();

      // Fresh fee data arrives (rate changes)
      await act(async () => {
        rerender(
          <AutoMintPanel
            {...makeProps({
              hasActiveChain: false,
              chainLength: 0,
              chainsCount: 0,
              totalChainsTx: 0,
              currentFeeRate: 0.52,
              currentEffectiveRate: 0,
            })}
          />
        );
      });

      expect(screen.queryByText(/CONFIRMED/)).not.toBeInTheDocument();
    });

    it("unblocks after timeout even if fee rate stays the same (BUG FIX)", async () => {
      const props = makeProps({
        hasActiveChain: true,
        chainLength: 10,
        chainsCount: 1,
        totalChainsTx: 10,
        currentFeeRate: 0.5,
        currentEffectiveRate: 0.5,
      });
      const { rerender } = render(<AutoMintPanel {...props} />);
      fireEvent.click(screen.getByText("START"));

      // Chain confirmed
      await act(async () => {
        rerender(
          <AutoMintPanel
            {...makeProps({
              hasActiveChain: false,
              chainLength: 0,
              chainsCount: 0,
              totalChainsTx: 0,
              currentFeeRate: 0.5,
              currentEffectiveRate: 0,
            })}
          />
        );
      });
      expect(screen.getByText(/CONFIRMED/)).toBeInTheDocument();

      // Fee rate stays EXACTLY the same — this was the bug (waited forever)
      // Advance past the 30s timeout
      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      // Re-render with same fee to trigger effect
      await act(async () => {
        rerender(
          <AutoMintPanel
            {...makeProps({
              hasActiveChain: false,
              chainLength: 0,
              chainsCount: 0,
              totalChainsTx: 0,
              currentFeeRate: 0.5,
              currentEffectiveRate: 0,
            })}
          />
        );
      });

      // CONFIRMED should be cleared by the timeout
      expect(screen.queryByText(/CONFIRMED/)).not.toBeInTheDocument();
    });

    it("does NOT unblock before timeout if fee stays the same", async () => {
      const props = makeProps({
        hasActiveChain: true,
        chainLength: 10,
        chainsCount: 1,
        totalChainsTx: 10,
        currentFeeRate: 0.5,
        currentEffectiveRate: 0.5,
      });
      const { rerender } = render(<AutoMintPanel {...props} />);
      fireEvent.click(screen.getByText("START"));

      // Chain confirmed
      await act(async () => {
        rerender(
          <AutoMintPanel
            {...makeProps({
              hasActiveChain: false,
              chainLength: 0,
              chainsCount: 0,
              totalChainsTx: 0,
              currentFeeRate: 0.5,
              currentEffectiveRate: 0,
            })}
          />
        );
      });

      // Only advance 15 seconds (before the 30s timeout)
      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });

      // Re-render
      await act(async () => {
        rerender(
          <AutoMintPanel
            {...makeProps({
              hasActiveChain: false,
              chainLength: 0,
              chainsCount: 0,
              totalChainsTx: 0,
              currentFeeRate: 0.5,
              currentEffectiveRate: 0,
            })}
          />
        );
      });

      // Should still show CONFIRMED (not yet timed out)
      expect(screen.getByText(/CONFIRMED/)).toBeInTheDocument();
    });
  });

  describe("RBF failure handling", () => {
    it("shows RBF ERROR and does not infinite-loop retry", async () => {
      const onRbf = vi.fn().mockRejectedValue(new Error("Missing data for RBF"));
      const props = makeProps({
        onRbf,
        hasActiveChain: true,
        chainLength: 10,
        chainsCount: 1,
        totalChainsTx: 10,
        currentFeeRate: 1.0,
        currentEffectiveRate: 0.5,
      });
      const { rerender } = render(<AutoMintPanel {...props} />);

      // Enable auto-mint — auto-RBF triggers because effective 0.5 < target 1.0*1.1
      await act(async () => {
        fireEvent.click(screen.getByText("START"));
      });

      // Flush microtasks for promise rejection
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Should have been called exactly once (no infinite loop)
      expect(onRbf).toHaveBeenCalledTimes(1);

      // Error status should be shown
      expect(screen.queryByText(/RBF ERROR/)).toBeInTheDocument();

      // Same fee — should NOT retry (rbfTriggered stays true)
      await act(async () => {
        rerender(
          <AutoMintPanel
            {...makeProps({
              onRbf,
              hasActiveChain: true,
              chainLength: 10,
              chainsCount: 1,
              totalChainsTx: 10,
              currentFeeRate: 1.0,
              currentEffectiveRate: 0.5,
            })}
          />
        );
        await vi.advanceTimersByTimeAsync(0);
      });

      // Still exactly 1 call (no retry with same conditions)
      expect(onRbf).toHaveBeenCalledTimes(1);
    });
  });

  describe("session spending limit", () => {
    it("blocks mint when estimated cost exceeds session limit", async () => {
      const onMint = vi.fn().mockResolvedValue(undefined);
      render(
        <AutoMintPanel {...makeProps({ onMint, currentFeeRate: 1.0 })} />
      );

      // Set session limit to 10 sats (way too low for 20 mints)
      const limitInput = screen.getAllByRole("spinbutton").find(
        (el) => (el as HTMLInputElement).placeholder === "∞"
      );
      expect(limitInput).toBeDefined();
      fireEvent.change(limitInput!, { target: { value: "10" } });

      // Enable auto-mint
      fireEvent.click(screen.getByText("START"));
      await act(async () => { vi.advanceTimersByTime(100); });

      // 20 mints * ceil(141 * 1.0) = 2820 sats > 10 sats limit
      expect(onMint).not.toHaveBeenCalled();

      // Status should show LIMIT
      expect(screen.getByText(/LIMIT/)).toBeInTheDocument();
    });
  });

  describe("chain full", () => {
    it("does not trigger mint when chain length equals max", async () => {
      const onMint = vi.fn().mockResolvedValue(undefined);
      render(
        <AutoMintPanel {...makeProps({ onMint, chainLength: 25 })} />
      );
      fireEvent.click(screen.getByText("START"));
      await act(async () => { vi.advanceTimersByTime(100); });
      expect(onMint).not.toHaveBeenCalled();
    });
  });
});
