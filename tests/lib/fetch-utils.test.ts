import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout } from "@/lib/fetch-utils";

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockFetch(response: Partial<Response>) {
    const res = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue(""),
      ...response,
    } as unknown as Response;
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(res);
    return res;
  }

  function mockFetchDelayed(delayMs: number, response: Partial<Response>) {
    const res = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue(""),
      ...response,
    } as unknown as Response;
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_input: any, init?: RequestInit) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(res), delayMs);
          // Listen for abort signal
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new DOMException("The operation was aborted.", "AbortError");
            reject(err);
          });
        })
    );
    return res;
  }

  it("returns response on successful fetch", async () => {
    const mockRes = mockFetch({ status: 200, ok: true });

    const result = await fetchWithTimeout("https://example.com/api");

    expect(fetch).toHaveBeenCalledOnce();
    expect(result).toBe(mockRes);
  });

  it("passes init options (method, headers, body) to fetch", async () => {
    mockFetch({ status: 200, ok: true });

    await fetchWithTimeout("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"key":"value"}',
    });

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe("https://example.com/api");
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].headers).toEqual({ "Content-Type": "application/json" });
    expect(callArgs[1].body).toBe('{"key":"value"}');
  });

  it("attaches AbortController signal to fetch", async () => {
    mockFetch({ status: 200, ok: true });

    await fetchWithTimeout("https://example.com/api");

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("throws on HTTP 404", async () => {
    mockFetch({ status: 404, statusText: "Not Found", ok: false });

    await expect(fetchWithTimeout("https://example.com/missing")).rejects.toThrow(
      "HTTP 404 Not Found"
    );
  });

  it("throws on HTTP 500", async () => {
    mockFetch({ status: 500, statusText: "Internal Server Error", ok: false });

    await expect(fetchWithTimeout("https://example.com/broken")).rejects.toThrow(
      "HTTP 500 Internal Server Error"
    );
  });

  it("throws on HTTP 502", async () => {
    mockFetch({ status: 502, statusText: "Bad Gateway", ok: false });

    await expect(fetchWithTimeout("https://example.com/down")).rejects.toThrow(
      "HTTP 502 Bad Gateway"
    );
  });

  it("throws timeout error after default 30s", async () => {
    mockFetchDelayed(60_000, { status: 200, ok: true });

    // Attach catch immediately to prevent unhandled rejection
    let caughtError: Error | null = null;
    const promise = fetchWithTimeout("https://example.com/slow").catch((err) => {
      caughtError = err;
    });

    await vi.advanceTimersByTimeAsync(30_000);
    await promise;

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError!.message).toBe("Request timed out after 30s");
  });

  it("throws timeout error after custom timeoutMs", async () => {
    mockFetchDelayed(10_000, { status: 200, ok: true });

    let caughtError: Error | null = null;
    const promise = fetchWithTimeout("https://example.com/slow", { timeoutMs: 5_000 }).catch(
      (err) => {
        caughtError = err;
      }
    );

    await vi.advanceTimersByTimeAsync(5_000);
    await promise;

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError!.message).toBe("Request timed out after 5s");
  });

  it("does NOT timeout if response arrives before deadline", async () => {
    mockFetchDelayed(1_000, { status: 200, ok: true });

    const promise = fetchWithTimeout("https://example.com/fast", { timeoutMs: 5_000 });

    await vi.advanceTimersByTimeAsync(1_000);

    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it("does not pass timeoutMs to underlying fetch", async () => {
    mockFetch({ status: 200, ok: true });

    await fetchWithTimeout("https://example.com/api", { timeoutMs: 5_000 });

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty("timeoutMs");
  });

  it("re-throws network errors as-is (not wrapped as timeout)", async () => {
    const networkError = new TypeError("Failed to fetch");
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(networkError);

    await expect(fetchWithTimeout("https://example.com/offline")).rejects.toThrow(
      "Failed to fetch"
    );
  });

  it("clears timeout timer on success (no leaked timers)", async () => {
    mockFetch({ status: 200, ok: true });
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    await fetchWithTimeout("https://example.com/api");

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("clears timeout timer on HTTP error (no leaked timers)", async () => {
    mockFetch({ status: 500, statusText: "Internal Server Error", ok: false });
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    await expect(fetchWithTimeout("https://example.com/error")).rejects.toThrow();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
