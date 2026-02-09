import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the global fetch for RPC calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// We need to import DIESEL_TOKEN to know the expected block/tx values
import { DIESEL_TOKEN } from "@/lib/alkanes-client";

// We'll test getDieselBalanceAtBlock by importing the AlkanesClient class
// Since alkanesClient is a singleton, we import the class directly
// Actually, the module exports an alkanesClient instance, so let's use that
import { alkanesClient } from "@/lib/alkanes-client";

describe("getDieselBalanceAtBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns aggregated DIESEL balance from multiple outpoints", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: 1,
          result: {
            outpoints: [
              {
                balance_sheet: {
                  cached: {
                    balances: [
                      { block: DIESEL_TOKEN.alkaneId.block, tx: DIESEL_TOKEN.alkaneId.tx, amount: "5000000" },
                    ],
                  },
                },
              },
              {
                balance_sheet: {
                  cached: {
                    balances: [
                      { block: DIESEL_TOKEN.alkaneId.block, tx: DIESEL_TOKEN.alkaneId.tx, amount: "3000000" },
                      { block: 99, tx: 0, amount: "999999" }, // non-DIESEL token, should be ignored
                    ],
                  },
                },
              },
            ],
          },
        }),
    });

    const balance = await alkanesClient.getDieselBalanceAtBlock("bc1qtest", 900000);

    expect(balance).toBe(BigInt("8000000")); // 5M + 3M
    expect(mockFetch).toHaveBeenCalledOnce();

    // Verify RPC params
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.method).toBe("alkanes_protorunesbyaddress");
    expect(callBody.params[0].address).toBe("bc1qtest");
    expect(callBody.params[0].protocolTag).toBe(1);
    expect(callBody.params[1]).toBe("900000"); // blockHeight as string
  });

  it("returns 0 when address has no DIESEL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: 1,
          result: {
            outpoints: [
              {
                balance_sheet: {
                  cached: {
                    balances: [
                      { block: 99, tx: 1, amount: "1000000" }, // Not DIESEL
                    ],
                  },
                },
              },
            ],
          },
        }),
    });

    const balance = await alkanesClient.getDieselBalanceAtBlock("bc1qnodiesel", 900000);
    expect(balance).toBe(BigInt(0));
  });

  it("returns 0 when outpoints array is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: 1,
          result: { outpoints: [] },
        }),
    });

    const balance = await alkanesClient.getDieselBalanceAtBlock("bc1qempty", 900000);
    expect(balance).toBe(BigInt(0));
  });

  it("returns 0 when result has no outpoints field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: 1,
          result: {},
        }),
    });

    const balance = await alkanesClient.getDieselBalanceAtBlock("bc1qnofield", 900000);
    expect(balance).toBe(BigInt(0));
  });

  it("returns 0 on RPC error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const balance = await alkanesClient.getDieselBalanceAtBlock("bc1qfail", 900000);
    expect(balance).toBe(BigInt(0));
  });

  it("returns 0 on HTTP error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal server error" }),
    });

    const balance = await alkanesClient.getDieselBalanceAtBlock("bc1qhttp500", 900000);
    expect(balance).toBe(BigInt(0));
  });

  it("handles outpoints with missing balance_sheet", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: 1,
          result: {
            outpoints: [
              {}, // no balance_sheet
              { balance_sheet: null },
              { balance_sheet: { cached: null } },
              { balance_sheet: { cached: { balances: [] } } },
            ],
          },
        }),
    });

    const balance = await alkanesClient.getDieselBalanceAtBlock("bc1qpartial", 900000);
    expect(balance).toBe(BigInt(0));
  });

  it("handles large balance values correctly", async () => {
    const largeAmount = "99999999999999999"; // ~1 billion DIESEL (8 decimals)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: 1,
          result: {
            outpoints: [
              {
                balance_sheet: {
                  cached: {
                    balances: [
                      { block: DIESEL_TOKEN.alkaneId.block, tx: DIESEL_TOKEN.alkaneId.tx, amount: largeAmount },
                    ],
                  },
                },
              },
            ],
          },
        }),
    });

    const balance = await alkanesClient.getDieselBalanceAtBlock("bc1qwhale", 900000);
    expect(balance).toBe(BigInt(largeAmount));
  });
});
