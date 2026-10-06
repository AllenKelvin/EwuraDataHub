const API_KEY = process.env.ALLENDATAHUB_API_KEY;
const BASE_URL = (() => {
  const configured = (process.env.ALLENDATAHUB_BASE_URL || "https://allendatahub.onrender.com").trim();
  const normalized = configured.replace(/\/+$/, "");
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
})();

export const availableVolumes: Record<string, number[]> = {
  MTN: [1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30, 40, 50, 100],
  Telecel: [5, 10, 15, 20, 25, 30, 40, 50, 100],
  AirtelTigo: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20],
};

function extractVolume(size: string | number): number {
  if (typeof size === "number") return size;
  const match = String(size).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "x-api-key": API_KEY,
    ...extraHeaders,
  };
}

function generateIdempotencyKey(recipient: string, network: string, bundleSize: string | number, reference?: string) {
  const safeRecipient = String(recipient || "customer").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24) || "customer";
  const size = extractVolume(bundleSize);
  const stableReference = String(reference || `${safeRecipient}-${network}-${size}gb`).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || "checkout";
  return `checkout-${stableReference}`;
}

function normalizeVendorStatus(data: any) {
  const rawStatus = String(
    data?.status ??
      data?.vendorStatus ??
      data?.order?.status ??
      data?.order?.vendorStatus ??
      data?.data?.status ??
      data?.data?.vendorStatus ??
      data?.result?.status ??
      data?.payload?.status ??
      "",
  ).trim();

  const normalized = rawStatus.toLowerCase();

  if (["completed", "complete", "delivered", "success", "successful"].includes(normalized)) {
    return { status: "completed", vendorStatus: rawStatus || null };
  }

  if (["failed", "failure", "error", "cancelled", "canceled"].includes(normalized)) {
    return { status: "failed", vendorStatus: rawStatus || null };
  }

  if (["processing", "in_progress", "in-progress", "queued", "pending_confirmation"].includes(normalized)) {
    return { status: "processing", vendorStatus: rawStatus || null };
  }

  if (["pending", "submitted", "created", "awaiting", "inqueue", "in_queue"].includes(normalized)) {
    return { status: "pending", vendorStatus: rawStatus || null };
  }

  return { status: normalized ? "pending" : null, vendorStatus: rawStatus || null };
}

class AllenDataHubService {
  constructor() {
    console.log(`[AllenDataHub] Configured with base URL ${BASE_URL}`);
  }

  async purchaseDataBundle(
    recipient: string,
    bundleSize: string | number,
    network: string,
    packageName: string,
    options?: { idempotencyKey?: string },
  ) {
    if (!API_KEY) {
      return { success: false, error: "ALLENDATAHUB_API_KEY is not configured", status: "failed" };
    }

    const size = extractVolume(bundleSize);
    const headers: Record<string, string> = {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const idempotencyKey = options?.idempotencyKey || generateIdempotencyKey(recipient, network, bundleSize, `order-${recipient}-${network}-${size}`);
    headers["Idempotency-Key"] = idempotencyKey;

    const response = await fetch(`${BASE_URL}/data/purchase`, {
      method: "POST",
      headers,
      body: JSON.stringify({ network, size: `${size} GB`, recipient, packageName }),
    });

    const rawText = await response.text();
    let data: any = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { raw: rawText };
      }
    }

    if (!response.ok || data.success === false || data.ok === false) {
      console.error("[AllenDataHub] Order request failed", {
        status: response.status,
        request: { network, size: `${size} GB`, recipient, packageName },
        response: data,
      });
      return {
        success: false,
        error: data.error || data.message || data.raw || `AllenDataHub API returned HTTP ${response.status}`,
        status: "failed",
        code: response.status,
        raw: data,
      };
    }

    const externalOrderId = data.orderId || data.id || data.order?.id || data.reference || data.transactionId;
    const { status, vendorStatus } = normalizeVendorStatus(data);
    return {
      success: true,
      orderId: externalOrderId,
      transactionId: externalOrderId,
      reference: data.reference || externalOrderId,
      status: status || "pending",
      vendorStatus: vendorStatus || null,
      message: data.message || "Order submitted to AllenDataHub",
      raw: data,
    };
  }

  async getOrderStatus(orderId: string) {
    if (!API_KEY || !orderId) return null;

    const response = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        ...getAuthHeaders(),
        Accept: "application/json",
      },
    });
    const rawText = await response.text();
    let data: any = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { raw: rawText };
      }
    }
    if (!response.ok) return null;

    const { status, vendorStatus } = normalizeVendorStatus(data);
    return { status: status || "pending", vendorStatus: vendorStatus || null, raw: data };
  }
}

export const allenDataHubService = new AllenDataHubService();
export default allenDataHubService;