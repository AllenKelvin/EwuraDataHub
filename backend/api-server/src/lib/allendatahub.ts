import { normalizePhoneNumber } from "./phone-utils";

const API_KEY = process.env.ALLENDATAHUB_API_KEY || "adh_live_m5bym0FLYL5V9k2sFem2nefru1QIOQdialtFftm_IQk";
const BASE_URL = process.env.ALLENDATAHUB_BASE_URL || "https://allendatahub.com";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const DEFAULT_WEBHOOK_URL = `${BACKEND_URL.replace(/\/+$/, "")}/api/vendor/allen-datahub/webhook`;

const supportedNetworks = ["MTN", "Telecel", "AirtelTigo"];
const supportedVolumes: Record<string, number[]> = {
  MTN: [1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30, 40, 50, 100],
  Telecel: [5, 10, 15, 20, 25, 30, 40, 50, 100],
  AirtelTigo: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20],
};

export interface AllenDataHubProduct {
  id: string;
  name: string;
  network: string;
  dataAmount: string;
  description: string | null;
  apiPrice: number;
}

export interface AllenDataHubPurchaseRequest {
  phoneNumber: string;
  network: string;
  volume: number;
  webhookUrl?: string;
}

export interface AllenDataHubPurchaseResponse {
  success: boolean;
  order?: Record<string, any>;
  orderId?: string;
  transactionId?: string;
  reference?: string;
  status?: string;
  message?: string;
  amount?: number;
  currency?: string;
  webhookUrl?: string;
  walletBalanceBefore?: number;
  walletBalanceAfter?: number;
  raw?: Record<string, any> | null;
  requestId?: string;
  error?: string;
}

interface WebhookParseResult {
  success: boolean;
  error?: string;
  event?: string;
  orderId?: string;
  vendorOrderId?: string;
  reference?: string;
  status?: string;
  webhookEvent?: string;
  phoneNumber?: string;
  dataAmount?: string | number;
  timestamp?: Date;
  raw?: Record<string, any>;
}

function validateNetwork(network: string): boolean {
  return supportedNetworks.includes(network);
}

function validateVolume(network: string, volume: number): boolean {
  return supportedVolumes[network]?.includes(volume) ?? false;
}

function formatPhoneForAllenDataHub(phone: string): string {
  if (!phone) return phone;
  if (phone.startsWith("233") && phone.length === 12) {
    return `0${phone.slice(3)}`;
  }
  return phone;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response from AllenDataHub: ${text}`);
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `AllenDataHub API error (${response.status})`;
    const error = new Error(message);
    (error as any).response = data;
    throw error;
  }

  return data as T;
}

class AllenDataHubService {
  constructor() {
    if (!API_KEY) {
      console.warn("[AllenDataHub] WARNING: ALLENDATAHUB_API_KEY is not configured. Using built-in key fallback.");
    }
    console.log(`[AllenDataHub] Initialized. Base: ${BASE_URL}, Webhook: ${DEFAULT_WEBHOOK_URL}`);
  }

  async getProducts(): Promise<AllenDataHubProduct[]> {
    const data = await fetchJson<{ products: AllenDataHubProduct[] }>("/api/v1/products", {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
      },
    });
    return data.products || [];
  }

  async purchaseDataBundle({ phoneNumber, network, volume, webhookUrl }: AllenDataHubPurchaseRequest): Promise<AllenDataHubPurchaseResponse> {
    if (!phoneNumber || !network || !volume) {
      return {
        success: false,
        error: "Missing required fields: phoneNumber, network, volume",
      };
    }

    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized.success || !normalized.formatted) {
      return {
        success: false,
        error: normalized.error || "Invalid phone number",
      };
    }

    if (!validateNetwork(network)) {
      return {
        success: false,
        error: `Unsupported network: ${network}`,
      };
    }

    if (!validateVolume(network, volume)) {
      return {
        success: false,
        error: `Unsupported volume ${volume} for network ${network}`,
      };
    }

    const payload = {
      phoneNumber: formatPhoneForAllenDataHub(normalized.formatted),
      network,
      volume,
      webhookUrl: webhookUrl || DEFAULT_WEBHOOK_URL,
    };

    try {
      const data = await fetchJson<AllenDataHubPurchaseResponse>("/api/v1/data/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify(payload),
      });

      return {
        ...data,
        orderId: data.orderId || data.order?.id || data.transactionId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AllenDataHub API error";
      return {
        success: false,
        error: message,
        raw: (err as any).response || null,
      };
    }
  }

  async getOrders(page = 1, limit = 20): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return await fetchJson<any>(`/api/v1/orders?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
      },
    });
  }

  async getOrder(orderId: string): Promise<any> {
    if (!orderId) {
      throw new Error("orderId is required");
    }
    return await fetchJson<any>(`/api/v1/orders/${orderId}`, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
      },
    });
  }

  processWebhookPayload(payload: Record<string, any>): WebhookParseResult {
    if (!payload || typeof payload !== "object") {
      return { success: false, error: "Empty webhook payload" };
    }

    const event = payload.webhookEvent || payload.event || payload.type || "unknown";
    const orderId = payload.orderId || payload.vendorOrderId || payload.order_id || payload.transactionId;
    const reference = payload.reference || payload.requestId || payload.clientOrderReference || payload.vendorReference;
    const status = payload.status || payload.vendorStatus || payload.state || payload.statusCode;

    if (!orderId && !reference) {
      return { success: false, error: "Missing orderId or reference in webhook payload" };
    }

    const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

    return {
      success: true,
      event,
      orderId,
      vendorOrderId: orderId,
      reference,
      status: status?.toString(),
      webhookEvent: event,
      phoneNumber: payload.phoneNumber || payload.recipientPhone || payload.msisdn,
      dataAmount: payload.dataAmount || payload.volume || payload.bundleSize,
      timestamp,
      raw: payload,
    };
  }
}

const allenDataHubService = new AllenDataHubService();
export default allenDataHubService;
