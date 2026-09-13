// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { VerifyPoller } from "./verify-poller";

const MAX_ATTEMPTS = 6;

describe("VerifyPoller", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    // Pin Math.random to 0.5 so jitter = floor(0.5 * baseDelay) — deterministic
    // and always > 0, so every setTimeout registers with fake timers.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockSyncResponses(responses: Array<{ status: string; provider_message?: string }>) {
    let callIndex = 0;
    fetchMock.mockImplementation(async () => {
      const resp = responses[callIndex] ?? { status: "PENDING" };
      callIndex++;
      return {
        ok: true,
        json: async () => resp,
      } as Response;
    });
  }

  // Advance fake time far enough to drain all 6 attempts + all backoff delays
  // (max backoff sum = 0+500+1000+2000+4000+8000 = 15500ms at 0.5 jitter factor).
  // advanceTimersByTimeAsync flushes both timers and the microtask queue, so
  // async loops that await setTimeout advance correctly.
  async function drainPoller() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(70_000);
    });
  }

  it("polls exactly 6 times then shows Verification Delayed when all PENDING", async () => {
    mockSyncResponses(
      Array.from({ length: MAX_ATTEMPTS }, () => ({ status: "PENDING" }))
    );

    render(<VerifyPoller token="test-token" />);

    await drainPoller();

    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(screen.getByText("Verification Delayed")).toBeTruthy();
    expect(screen.getByText("Check Again")).toBeTruthy();
  });

  it("stops polling immediately on PAID and renders success", async () => {
    mockSyncResponses([
      { status: "PENDING" },
      { status: "PENDING" },
      { status: "PENDING" },
      { status: "PENDING" },
      { status: "PENDING" },
      { status: "PAID", provider_message: "Payment confirmed" },
    ]);

    render(<VerifyPoller token="test-token" />);

    await drainPoller();

    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(screen.getByText("Payment Successful")).toBeTruthy();
    expect(screen.getByText("Payment confirmed")).toBeTruthy();
  });

  it("stops polling immediately on REJECTED", async () => {
    mockSyncResponses([
      { status: "PENDING" },
      { status: "REJECTED", provider_message: "Insufficient funds" },
    ]);

    render(<VerifyPoller token="test-token" />);

    await drainPoller();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Payment Rejected")).toBeTruthy();
    expect(screen.getByText("Insufficient funds")).toBeTruthy();
  });

  it("respects the 60s hard ceiling even if attempts remain", async () => {
    // Approach: make fetch fast (resolves immediately) but advance fake Date.now
    // by 61s before the component mounts so the first elapsed check fires the
    // ceiling. We do this by rendering, then immediately advancing time past the
    // ceiling, then flushing all async work.
    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({ status: "PENDING" }),
      } as Response;
    });

    // Advance fake clock by 61s so the first iteration's elapsed check exceeds
    // the ceiling after the initial callSync resolves.
    render(<VerifyPoller token="test-token" />);

    // Let the first fetch fire, then jump the clock past the ceiling so the
    // loop's next elapsed check sees >= 60_000ms.
    await act(async () => {
      // Drain the first immediate fetch (attempt 1).
      await vi.advanceTimersByTimeAsync(0);
    });
    // Jump the clock past the hard ceiling.
    vi.setSystemTime(Date.now() + 61_000);
    // Drain backoff timers and allow the loop to check elapsed again.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(70_000);
    });
    await act(async () => {});

    expect(callCount).toBeLessThan(MAX_ATTEMPTS);
    expect(screen.getByText("Verification Delayed")).toBeTruthy();
  });

  it("uses statusHint=failure to show alternate initial copy", async () => {
    mockSyncResponses([{ status: "PENDING" }]);

    render(<VerifyPoller token="test-token" statusHint="failure" />);

    expect(screen.getByText("Confirming payment status…")).toBeTruthy();

    await drainPoller();
  });

  it("manual retry makes a single immediate call without restarting backoff", async () => {
    mockSyncResponses(
      Array.from({ length: MAX_ATTEMPTS }, () => ({ status: "PENDING" }))
    );

    render(<VerifyPoller token="test-token" />);

    await drainPoller();

    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(screen.getByText("Check Again")).toBeTruthy();

    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ status: "PAID", provider_message: "Late confirmation" }),
    } as Response));

    // Click and wait for the async state update to flush.
    await act(async () => {
      screen.getByText("Check Again").click();
    });
    // Flush the resolved promise and React state update.
    await act(async () => {});

    expect(screen.getByText("Payment Successful")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS + 1);
  });
});
