/**
 * Vendor API Client - AllenDataHub Integration
 * Handles all communication with the AllenDataHub API
 */

export type VendorProduct = {
  id: string;
  name: string;
  network: string;
  dataAmount: string;
  description: string;
  apiPrice: number;
};

export type VendorOrder = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  paymentStatus: string;
  orderSource: string;
  phoneNumber: string;
  price: number;
  productName: string;
  productNetwork: string;
  dataAmount: string;
  createdAt: string;
  updatedAt: string;
  walletBalanceBefore: number;
  walletBalanceAfter: number;
};

export type VendorOrderDetail = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  paymentStatus: string;
  orderSource: string;
  phoneNumber: string;
  price: number;
  productName: string;
  productNetwork: string;
  dataAmount: string;
  createdAt: string;
  updatedAt: string;
  lastStatusUpdateAt: string;
  lastVendorWebhook?: {
    vendorStatus: string;
    at: string;
  };
  webhookHistory?: Array<{
    status: string;
    timestamp: string;
    message: string;
  }>;
};

class VendorAPIClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number = 10000; // 10 seconds

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.VENDOR_API_KEY || "";
    this.baseUrl = baseUrl || "https://api.allendatahub.com";

    if (!this.apiKey) {
      throw new Error("VENDOR_API_KEY environment variable is not set");
    }
  }

  private getHeaders(): HeadersInit {
    return {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(
          `Vendor API Error (${response.status}): ${error.message || response.statusText}`
        );
      }

      return await response.json() as T;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Vendor API Request failed: ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * Get all available products
   */
  async getProducts(): Promise<VendorProduct[]> {
    const response = await this.request<{ products: VendorProduct[] }>(
      "GET",
      "/api/v1/products"
    );
    return response.products;
  }

  /**
   * Create a new order with vendor
   */
  async createOrder(
    productId: string,
    phoneNumber: string
  ): Promise<{ order: VendorOrder }> {
    return this.request<{ order: VendorOrder }>(
      "POST",
      "/api/v1/orders",
      {
        productId,
        phoneNumber,
      }
    );
  }

  /**
   * Get all orders (with pagination)
   */
  async getOrders(
    page: number = 1,
    limit: number = 20,
    source: "api" | "web" | "all" = "api"
  ): Promise<{
    orders: VendorOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    completedCount: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      source,
    });

    return this.request(
      "GET",
      `/api/v1/orders?${params.toString()}`
    ) as Promise<any>;
  }

  /**
   * Get specific order details
   */
  async getOrderDetails(orderId: string): Promise<{ order: VendorOrderDetail }> {
    return this.request<{ order: VendorOrderDetail }>(
      "GET",
      `/api/v1/orders/${orderId}`
    );
  }

  /**
   * Validate phone number format (before sending to vendor)
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Remove common formatting
    const cleaned = phoneNumber
      .replace(/-/g, "")
      .replace(/ /g, "")
      .replace(/\+/g, "");

    // Check various Ghanaian formats
    const patterns = [
      /^233\d{9}$/, // +233XXXXXXXXX format
      /^0\d{9}$/, // 0XXXXXXXXX format
      /^\d{9}$/, // XXXXXXXXX format (9 digits)
    ];

    return patterns.some((pattern) => pattern.test(cleaned));
  }

  /**
   * Format phone number to standard format
   */
  static formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber
      .replace(/-/g, "")
      .replace(/ /g, "")
      .replace(/\+/g, "");

    // Convert to international format (233XXXXXXXXX)
    if (cleaned.startsWith("0")) {
      return "233" + cleaned.slice(1);
    }

    if (!cleaned.startsWith("233")) {
      return "233" + cleaned;
    }

    return cleaned;
  }
}

export default VendorAPIClient;
