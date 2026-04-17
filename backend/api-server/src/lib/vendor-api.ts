/**
 * Vendor API Client - AllenDataHub Integration
 * Handles all communication with the AllenDataHub API
 * 
 * Features:
 * - Automatic phone number normalization (accepts any format)
 * - Request ID tracking for debugging
 * - Structured error responses with helpful messages
 * - Full webhook support
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

export type PhoneNormalizationResult = {
  valid: boolean;
  normalized?: string;
  error?: string;
};

class VendorAPIClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number = 10000; // 10 seconds

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.VENDOR_API_KEY || "";
    this.baseUrl = baseUrl || "https://allendatahub.com";

    if (!this.apiKey) {
      console.error("❌ VENDOR_API_KEY environment variable is not set!");
      console.error("   Please set: VENDOR_API_KEY=adh_<your_key>");
      throw new Error("VENDOR_API_KEY environment variable is not set");
    }

    console.log(`✅ VendorAPIClient initialized with:`);
    console.log(`   Base URL: ${this.baseUrl}`);
    console.log(`   API Key: ${this.apiKey.slice(0, 8)}...${this.apiKey.slice(-4)}`);
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
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    console.log(`
📤 [${requestId}] VENDOR API REQUEST
   Method:   ${method}
   URL:      ${url}
   Headers:  X-API-Key: ${this.apiKey.slice(0, 8)}...${this.apiKey.slice(-4)}
   Body:     ${body ? JSON.stringify(body) : "none"}
`);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });

      const duration = Date.now() - startTime;
      const responseBody = await response.json() as any;

      if (!response.ok) {
        console.error(`
❌ [${requestId}] VENDOR API ERROR (${response.status})
   Duration: ${duration}ms
   Status:   ${response.status} ${response.statusText}
   Error:    ${responseBody.error || responseBody.message || "Unknown error"}
   Details:  ${JSON.stringify(responseBody, null, 2)}
`);

        const errorMessage = responseBody.message || responseBody.error || response.statusText;
        const error = new Error(
          `Vendor API Error (${response.status}): ${errorMessage}`
        );
        (error as any).statusCode = response.status;
        (error as any).responseBody = responseBody;
        (error as any).requestId = requestId;
        throw error;
      }

      console.log(`
✅ [${requestId}] VENDOR API SUCCESS
   Duration: ${duration}ms
   Status:   ${response.status}
   Response: ${JSON.stringify(responseBody, null, 2)}
`);

      return responseBody as T;
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      console.error(`
❌ [${requestId}] VENDOR API REQUEST FAILED (${duration}ms)
   Error Type: ${(err as any)?.constructor?.name || "Unknown"}
   Error: ${errorMsg}
   Stack: ${err instanceof Error ? err.stack : "N/A"}
`);

      if (err instanceof Error) {
        const enhancedError = new Error(
          `Vendor API Request failed: ${err.message}`
        );
        (enhancedError as any).requestId = requestId;
        (enhancedError as any).originalError = err;
        throw enhancedError;
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
    // Validate and normalize phone number
    const phoneValidation = this.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      console.error(`
❌ INVALID PHONE NUMBER
   Raw Input:    ${phoneNumber}
   Error:        ${phoneValidation.error}
   Expected:     0XXXXXXXXX format (10 digits)
   Examples:     0541234567, +233541234567, 541234567
`);
      throw new Error(`Invalid phone number: ${phoneValidation.error}`);
    }

    const normalizedPhone = phoneValidation.normalized!;
    console.log(`
📞 PHONE NUMBER NORMALIZATION
   Input:        ${phoneNumber}
   Normalized:   ${normalizedPhone}
   Valid:        ✅
`);

    // Validate product ID format
    if (!/^[a-f0-9]{24}$/.test(productId) && !/^[a-zA-Z0-9_-]{5,}$/.test(productId)) {
      console.error(`
❌ INVALID PRODUCT ID
   Product ID:   ${productId}
   Format:       Must be 24-char hex (MongoDB) or vendor product ID
`);
      throw new Error(`Invalid product ID format: ${productId}`);
    }

    console.log(`
🛒 CREATING VENDOR ORDER
   Product ID:   ${productId}
   Phone:        ${normalizedPhone}
   Payload:      {"productId": "${productId}", "phoneNumber": "${normalizedPhone}"}
`);

    return this.request<{ order: VendorOrder }>(
      "POST",
      "/api/v1/orders",
      {
        productId,
        phoneNumber: normalizedPhone,
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
   * Normalize phone number to 0XXXXXXXXX format
   * Accepts any reasonable phone number format and auto-corrects
   * 
   * Accepted formats:
   * - 0541234567 (10 digits with 0) → 0541234567 ✅
   * - 541234567 (9 digits without 0) → 0541234567 ✅
   * - +233541234567 (international with +) → 0541234567 ✅
   * - 233541234567 (international without +) → 0541234567 ✅
   * - 0541 234 567 (with spaces) → 0541234567 ✅
   * - 0541-234-567 (with dashes) → 0541234567 ✅
   */
  private validatePhoneNumber(phone: string): PhoneNormalizationResult {
    return VendorAPIClient.normalizePhoneNumber(phone);
  }

  /**
   * Normalize phone number to 0XXXXXXXXX format
   * Accepts any reasonable phone number format and auto-corrects
   * 
   * Accepted formats:
   * - 0541234567 (10 digits with 0) → 0541234567 ✅
   * - 541234567 (9 digits without 0) → 0541234567 ✅
   * - +233541234567 (international with +) → 0541234567 ✅
   * - 233541234567 (international without +) → 0541234567 ✅
   * - 0541 234 567 (with spaces) → 0541234567 ✅
   * - 0541-234-567 (with dashes) → 0541234567 ✅
   */
  static normalizePhoneNumber(phone: string): PhoneNormalizationResult {
    if (!phone || typeof phone !== "string") {
      return {
        valid: false,
        error: "Phone number is required",
      };
    }

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, "");

    // Handle different formats
    if (cleaned.startsWith("233") && cleaned.length === 12) {
      // International: 233541234567 → 0541234567
      cleaned = "0" + cleaned.slice(3);
    } else if (cleaned.startsWith("0") && cleaned.length === 10) {
      // Already correct: 0541234567 → 0541234567
      cleaned = cleaned;
    } else if (cleaned.length === 9) {
      // No prefix: 541234567 → 0541234567
      cleaned = "0" + cleaned;
    } else {
      return {
        valid: false,
        error: `Invalid phone format. Expected format: 0XXXXXXXXX (10 digits). Examples: "0541234567", "+233541234567", "541234567". Received: "${phone}"`,
      };
    }

    return { valid: true, normalized: cleaned };
  }

  /**
   * Validate phone number format (before sending to vendor)
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    const result = this.normalizePhoneNumber(phoneNumber);
    return result.valid;
  }

  /**
   * Format phone number to standard format (10 digits: 0XXXXXXXXX)
   * Wrapper around normalizePhoneNumber for backward compatibility
   */
  static formatPhoneNumber(phoneNumber: string): string {
    const result = this.normalizePhoneNumber(phoneNumber);
    if (!result.valid) {
      throw new Error(result.error);
    }
    return result.normalized!;
  }
}

export default VendorAPIClient;
