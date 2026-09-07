const API_KEY = process.env.ALLENDATAHUB_API_KEY;
const BASE_URL = "https://allendatahub.onrender.com";

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

class AllenDataHubService {
  constructor() {
    console.log(`[AllenDataHub] Configured with base URL ${BASE_URL}`);
  }

  async purchaseDataBundle(
    recipient: string,
    bundleSize: string | number,
    network: string,
    packageName: string,
  ) {
    if (!API_KEY) {
      return { success: false, error: "ALLENDATAHUB_API_KEY is not configured", status: "failed" };
    }

    const size = extractVolume(bundleSize);
    const response = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ network, size: `${size} GB`, recipient, packageName }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false || data.ok === false) {
      return {
        success: false,
        error: data.error || data.message || `AllenDataHub API returned HTTP ${response.status}`,
        status: "failed",
        code: response.status,
        raw: data,
      };
    }

    const externalOrderId = data.orderId || data.id || data.order?.id;
    return {
      success: true,
      transactionId: externalOrderId,
      reference: data.reference || externalOrderId,
      status: data.status || "pending",
      message: data.message || "Order submitted to AllenDataHub",
      raw: data,
    };
  }

  async getOrderStatus(orderId: string) {
    if (!API_KEY || !orderId) return null;

    const response = await fetch(`${BASE_URL}/api/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;

    const rawStatus = String(data.status || data.order?.status || "").toLowerCase();
    const status = ["completed", "complete", "delivered", "success", "successful"].includes(rawStatus)
      ? "completed"
      : ["failed", "failure", "error", "cancelled", "canceled"].includes(rawStatus)
        ? "failed"
        : ["processing", "in_progress", "in-progress"].includes(rawStatus)
          ? "processing"
          : "pending";

    return { status, vendorStatus: rawStatus || null, raw: data };
  }
}

export const allenDataHubService = new AllenDataHubService();
export default allenDataHubService;