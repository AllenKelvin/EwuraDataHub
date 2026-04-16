/**
 * Request ID Tracking Utility
 * Generates unique request IDs for debugging and support
 * 
 * Usage:
 * - Every API response should include a requestId
 * - Include in response headers as X-Request-ID
 * - Include in response body for easier client-side access
 */

/**
 * Generate a unique request ID
 * Format: req_<timestamp>_<random>
 * Example: req_1705330245123_abc123xyz
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `req_${timestamp}_${random}`;
}

/**
 * Attach request ID to response
 * - Sets X-Request-ID header
 * - Returns requestId for body inclusion
 */
export function setRequestId(res: any, requestId: string): void {
  res.setHeader("X-Request-ID", requestId);
}

/**
 * Error response with request ID
 */
export function createErrorResponse(
  error: string | Error,
  errorCode: string,
  statusCode: number,
  requestId: string,
  additional?: Record<string, any>
): Record<string, any> {
  const message = error instanceof Error ? error.message : error;

  return {
    error: errorCode,
    message,
    requestId,
    ...additional,
  };
}

/**
 * Success response with request ID
 */
export function createSuccessResponse(
  data: any,
  requestId: string
): Record<string, any> {
  return {
    ...data,
    requestId,
  };
}

/**
 * Middleware to attach request ID to all responses
 * Add this to your Express app:
 * app.use(requestIdMiddleware);
 */
export function requestIdMiddleware(req: any, res: any, next: any): void {
  const requestId = generateRequestId();
  req.requestId = requestId;
  setRequestId(res, requestId);
  next();
}
