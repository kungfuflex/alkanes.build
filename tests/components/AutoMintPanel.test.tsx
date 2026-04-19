import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutoMintPanel } from "@/components/AutoMintPanel";

function makeProps(overrides: Record<string, any> = {}) {
  return {
    currentFeeRate: 0.5,
    isConnected: true,
    globalEnabled: false,
    onGlobalEnabledChange: vi.fn(),
    sessionSpent: 0,
    sessionLimit: 0,
    onSessionLimitChange: vi.fn(),
    onResetSpent: vi.fn(),
    onLaunch: vi.fn(),
    chainsCount: 0,
    ...overrides,
  };
}

describe("AutoMintPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("calls onGlobalEnabledChange on START/STOP click", () => {
    const onGlobalEnabledChange = vi.fn();
    render(<AutoMintPanel {...makeProps({ onGlobalEnabledChange })} />);
    fireEvent.click(screen.getByText("START"));
    expect(onGlobalEnabledChange).toHaveBeenCalledWith(true);
  });

  it("shows STOP when globalEnabled is true", () => {
    render(<AutoMintPanel {...makeProps({ globalEnabled: true })} />);
    expect(screen.getByText("STOP")).toBeInTheDocument();
  });

  it("calls onGlobalEnabledChange(false) on STOP click", () => {
    const onGlobalEnabledChange = vi.fn();
    render(<AutoMintPanel {...makeProps({ globalEnabled: true, onGlobalEnabledChange })} />);
    fireEvent.click(screen.getByText("STOP"));
    expect(onGlobalEnabledChange).toHaveBeenCalledWith(false);
  });

  describe("fee rate indicator", () => {
    it("shows fee rate value when fee is in range", () => {
      render(<AutoMintPanel {...makeProps({ currentFeeRate: 0.5 })} />);
      expect(screen.getByText("0.50")).toBeInTheDocument();
    });

    it("shows fee rate value when fee is out of range", () => {
      render(<AutoMintPanel {...makeProps({ currentFeeRate: 5.0 })} />);
      expect(screen.getByText("5.00")).toBeInTheDocument();
    });
  });

  describe("session spending limit", () => {
    it("calls onSessionLimitChange when limit is set", () => {
      const onSessionLimitChange = vi.fn();
      render(<AutoMintPanel {...makeProps({ onSessionLimitChange })} />);

      const limitInput = screen.getAllByRole("spinbutton").find(
        (el) => (el as HTMLInputElement).placeholder === "∞"
      );
      expect(limitInput).toBeDefined();
      fireEvent.change(limitInput!, { target: { value: "10000" } });

      expect(onSessionLimitChange).toHaveBeenCalledWith(10000);
    });

    it("shows SPENT counter when sessionSpent > 0", () => {
      render(<AutoMintPanel {...makeProps({ sessionSpent: 5000 })} />);
      expect(screen.getByText("SPENT")).toBeInTheDocument();
      expect(screen.getByText("5,000")).toBeInTheDocument();
    });

    it("shows SPENT / LIMIT when session limit is set", () => {
      render(<AutoMintPanel {...makeProps({ sessionSpent: 3000, sessionLimit: 10000 })} />);
      expect(screen.getByText("3,000")).toBeInTheDocument();
      expect(screen.getByText("10,000")).toBeInTheDocument();
    });

    it("calls onResetSpent when [RST] is clicked", () => {
      const onResetSpent = vi.fn();
      render(<AutoMintPanel {...makeProps({ sessionSpent: 5000, onResetSpent })} />);

      fireEvent.click(screen.getByText("[RST]"));
      expect(onResetSpent).toHaveBeenCalledTimes(1);
    });
  });

  describe("+ CHAIN inline panel", () => {
    it("shows + CHAIN button in header", () => {
      render(<AutoMintPanel {...makeProps()} />);
      expect(screen.getByText("+ CHAIN")).toBeInTheDocument();
    });

    it("expands config editor on + CHAIN click (no UTXO selector)", () => {
      render(<AutoMintPanel {...makeProps()} />);
      expect(screen.queryByText("CHAIN CONFIG")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("+ CHAIN"));
      expect(screen.getByText("CHAIN CONFIG")).toBeInTheDocument();
      expect(screen.getByText(/UTXO will be selected automatically/)).toBeInTheDocument();
    });

    it("collapses on close click", () => {
      render(<AutoMintPanel {...makeProps()} />);
      fireEvent.click(screen.getByText("+ CHAIN"));
      expect(screen.getByText("CHAIN CONFIG")).toBeInTheDocument();

      fireEvent.click(screen.getByText("✕"));
      expect(screen.queryByText("CHAIN CONFIG")).not.toBeInTheDocument();
    });

    it("calls onLaunch with config on + CHAIN add", () => {
      const onLaunch = vi.fn();
      render(<AutoMintPanel {...makeProps({ onLaunch })} />);
      fireEvent.click(screen.getByText("+ CHAIN"));

      // Click bottom + CHAIN button
      const addButtons = screen.getAllByText("+ CHAIN");
      const addBtn = addButtons[addButtons.length - 1];
      fireEvent.click(addBtn);

      expect(onLaunch).toHaveBeenCalledTimes(1);
      expect(onLaunch).toHaveBeenCalledWith(
        expect.objectContaining({ mintCount: 20, autoRbf: true })
      );
    });

    it("shows chains count when > 0", () => {
      render(<AutoMintPanel {...makeProps({ chainsCount: 3 })} />);
      expect(screen.getByText("3 chains")).toBeInTheDocument();
    });
  });
});
