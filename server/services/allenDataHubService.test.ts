import test from "node:test";
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.ALLENDATAHUB_API_KEY;
const originalBaseUrl = process.env.ALLENDATAHUB_BASE_URL;

test("uses documented AllenDataHub API base URL and stable idempotency headers", async () => {
  process.env.ALLENDATAHUB_API_KEY = "up_live_test";
  process.env.ALLENDATAHUB_BASE_URL = "https://example.test";

  const calls: Array<{ input: string | URL; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({ ok: true, orderId: "ord_123", status: "pending" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  const { default: service } = await import("./allenDataHubService.ts");
  await service.purchaseDataBundle("0249116309", "3 GB", "MTN", "MTN 3GB", {
    idempotencyKey: "checkout-2026-09-15-0001",
  });
  await service.purchaseDataBundle("0249116309", "3 GB", "MTN", "MTN 3GB", {
    idempotencyKey: "checkout-2026-09-15-0001",
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].input, "https://example.test/api/v1/data/purchase");
  const firstHeaders = (calls[0].init?.headers ?? {}) as Record<string, string>;
  const secondHeaders = (calls[1].init?.headers ?? {}) as Record<string, string>;
  const firstBody = JSON.parse(String((calls[0].init?.body ?? "{}")));
  assert.equal(firstHeaders.Authorization, "Bearer up_live_test");
  assert.equal(firstHeaders["x-api-key"], "up_live_test");
  assert.equal(firstHeaders["Idempotency-Key"], "checkout-2026-09-15-0001");
  assert.equal(secondHeaders["Idempotency-Key"], "checkout-2026-09-15-0001");
  assert.deepEqual(firstBody, {
    phoneNumber: "0249116309",
    network: "MTN",
    volume: 3,
  });
});

test("returns the vendor order id for polling and normalizes status values", async () => {
  process.env.ALLENDATAHUB_API_KEY = "up_live_test";
  process.env.ALLENDATAHUB_BASE_URL = "https://example.test";

  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    const payload = url.includes("/orders/")
      ? {
          ok: true,
          order: {
            id: "ord_456",
            status: "Completed",
            vendorStatus: "completed",
            vendorOrderId: "HUB-123456",
          },
        }
      : {
          success: true,
          orderId: "ord_456",
          status: "Pending",
          vendorStatus: "pending",
        };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const { default: service } = await import("./allenDataHubService.ts");
  const result = await service.purchaseDataBundle("0249116309", "3 GB", "MTN", "MTN 3GB");
  assert.equal(result.orderId, "ord_456");
  assert.equal(result.transactionId, "ord_456");
  assert.equal(result.status, "pending");

  const statusResult = await service.getOrderStatus("ord_456");
  assert.equal(statusResult?.status, "completed");
  assert.equal(statusResult?.vendorStatus, "Completed");
});

test.after(async () => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.ALLENDATAHUB_API_KEY;
  } else {
    process.env.ALLENDATAHUB_API_KEY = originalApiKey;
  }

  if (originalBaseUrl === undefined) {
    delete process.env.ALLENDATAHUB_BASE_URL;
  } else {
    process.env.ALLENDATAHUB_BASE_URL = originalBaseUrl;
  }
});
