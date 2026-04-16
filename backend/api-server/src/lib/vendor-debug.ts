/**
 * Vendor API Debug Utilities
 * Enhanced logging for troubleshooting vendor API integration
 */

export interface VendorDebugLog {
  timestamp: string;
  endpoint: string;
  method: string;
  requestId: string;
  apiKey: string; // masked for security
  phoneNumber: string;
  productId: string;
  requestBody: any;
  responseStatus?: number;
  responseBody?: any;
  error?: string;
  duration: number; // ms
}

class VendorDebugger {
  private logs: VendorDebugLog[] = [];

  logRequest(
    endpoint: string,
    method: string,
    requestId: string,
    apiKey: string,
    phoneNumber: string,
    productId: string,
    requestBody: any
  ) {
    const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : "MISSING";

    console.log(`
🔍 VENDOR API REQUEST
═══════════════════════════════════════════════════════════════
 Request ID:    ${requestId}
 Endpoint:      ${method} ${endpoint}
 API Key:       ${maskedKey}
 Phone Number:  ${phoneNumber}
 Product ID:    ${productId}
 Request Body:  ${JSON.stringify(requestBody, null, 2)}
═══════════════════════════════════════════════════════════════
    `);

    return {
      startTime: Date.now(),
    };
  }

  logResponse(
    startTime: number,
    requestId: string,
    status: number,
    body: any,
    endpoint: string
  ) {
    const duration = Date.now() - startTime;

    console.log(`
✅ VENDOR API RESPONSE
═══════════════════════════════════════════════════════════════
 Request ID:    ${requestId}
 Duration:      ${duration}ms
 Status:        ${status}
 Endpoint:      ${endpoint}
 Response:      ${JSON.stringify(body, null, 2)}
═══════════════════════════════════════════════════════════════
    `);
  }

  logError(
    startTime: number,
    requestId: string,
    endpoint: string,
    error: any
  ) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";

    console.error(`
❌ VENDOR API ERROR
═══════════════════════════════════════════════════════════════
 Request ID:    ${requestId}
 Duration:      ${duration}ms
 Endpoint:      ${endpoint}
 Error Type:    ${error?.constructor?.name || "Unknown"}
 Error Message: ${errorMsg}
 Stack Trace:
${stack}
═══════════════════════════════════════════════════════════════
    `);
  }

  checkConfig() {
    const apiKey = process.env.VENDOR_API_KEY;
    const baseUrl = process.env.VENDOR_API_URL;

    console.log(`
🔧 VENDOR API CONFIGURATION CHECK
═══════════════════════════════════════════════════════════════
 VENDOR_API_KEY:       ${apiKey ? "✅ SET" : "❌ MISSING"}
 VENDOR_API_URL:       ${baseUrl ? "✅ SET" : "❌ MISSING"}
 API Key Format:       ${apiKey?.startsWith("adh_") ? "✅ Correct (adh_...)" : "⚠️ Check format (should be adh_...)"}
 Base URL:             ${baseUrl || "MISSING"}
═══════════════════════════════════════════════════════════════
    `);

    if (!apiKey) {
      console.warn("⚠️ WARNING: VENDOR_API_KEY is not set!");
    }
    if (!baseUrl) {
      console.warn("⚠️ WARNING: VENDOR_API_URL is not set!");
    }

    return {
      configured: !!apiKey && !!baseUrl,
      apiKeySet: !!apiKey,
      urlSet: !!baseUrl,
    };
  }

  validatePhoneFormat(phone: string): { valid: boolean; issue?: string } {
    if (!phone) {
      return { valid: false, issue: "Phone number is empty" };
    }

    if (typeof phone !== "string") {
      return { valid: false, issue: `Phone is not a string (got ${typeof phone})` };
    }

    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 10 && cleaned.startsWith("0")) {
      return { valid: true };
    }

    return {
      valid: false,
      issue: `Phone length is ${cleaned.length}, expected 10. Format should be 0XXXXXXXXX. Raw: "${phone}"`,
    };
  }

  validateProductId(productId: string): { valid: boolean; issue?: string } {
    if (!productId) {
      return { valid: false, issue: "Product ID is empty" };
    }

    if (typeof productId !== "string") {
      return { valid: false, issue: `Product ID is not a string (got ${typeof productId})` };
    }

    // Check if it looks like a MongoDB ObjectId or vendor product ID
    const isMongoId = /^[a-f0-9]{24}$/.test(productId);
    const isVendorId = productId.length > 0 && productId.length < 100;

    if (!isMongoId && !isVendorId) {
      return {
        valid: false,
        issue: `Invalid product ID format. Got: "${productId}"`,
      };
    }

    return { valid: true };
  }

  printValidationResults(phone: string, productId: string) {
    const phoneValidation = this.validatePhoneFormat(phone);
    const productValidation = this.validateProductId(productId);

    console.log(`
📋 INPUT VALIDATION
═══════════════════════════════════════════════════════════════
 Phone Number:  ${phoneValidation.valid ? "✅ VALID" : `❌ INVALID\n             Issue: ${phoneValidation.issue}`}
 Product ID:    ${productValidation.valid ? "✅ VALID" : `❌ INVALID\n             Issue: ${productValidation.issue}`}
═══════════════════════════════════════════════════════════════
    `);

    return phoneValidation.valid && productValidation.valid;
  }
}

export default new VendorDebugger();
