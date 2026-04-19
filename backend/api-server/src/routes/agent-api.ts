/**
 * Agent API v2.0 Routes
 * Simplified API for partner integrations
 * Base: /agent-api
 */

import { Router, type Request, type Response } from "express";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { requireAuth } from "../lib/auth-middleware";
import { normalizePhoneNumber } from "../lib/phone-utils";
import { z } from "zod";

const router = Router();

// Generate request ID for every request
router.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  res.set("X-Request-ID", requestId);
  (req as any).requestId = requestId;
  next();
});

// Helper to send success response
function sendSuccess(res: Response, data: any, statusCode = 200, message = "") {
  return res.status(statusCode).json({
    success: true,
    ...data,
    ...(message && { message }),
  });
}

// Helper to send error response
function sendError(
  res: Response,
  error: string,
  message: string,
  statusCode = 400,
  extra?: any
) {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
    ...extra,
  });
}

// ============================================================================
// PUBLIC ENDPOINTS (No Authentication)
// ============================================================================

/**
 * GET /agent-api/health
 * Health check - no authentication required
 */
router.get("/health", (req: Request, res: Response) => {
  return sendSuccess(res, {
    service: "AllenDataHub Agent API",
    version: "2.0.0",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// PROTECTED ENDPOINTS (Require API Key Authentication)
// ============================================================================

/**
 * API Key Authentication Middleware
 */
router.use((req: Request, res: Response, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return sendError(
      res,
      "MISSING_API_KEY",
      "Missing X-API-Key header. Add: X-API-Key: your_api_key_here",
      401,
      { docs: "https://docs.allendatahub.com/agent-api" }
    );
  }

  // For now, validate against environment variable
  const validKey = process.env.AGENT_API_KEY || "test_key_12345";
  if (apiKey !== validKey) {
    return sendError(
      res,
      "INVALID_API_KEY",
      "Invalid or expired API key",
      401
    );
  }

  // In production, you'd look up the API key in database to get the user
  // For now, we'll set a test user
  (req as any).apiKey = apiKey;
  (req as any).agentId = process.env.TEST_AGENT_ID || "test_agent_id";

  next();
});

/**
 * POST /agent-api/orders/create
 * Create a new order
 */
router.post("/orders/create", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const agentId = (req as any).agentId;

    // Validate request body
    const schema = z.object({
      productId: z.string().min(1, "productId is required"),
      phoneNumber: z.string().min(1, "phoneNumber is required"),
      quantity: z.number().int().positive().default(1),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.flatten();
      return sendError(
        res,
        "INVALID_REQUEST",
        "Invalid request body",
        400,
        { errors }
      );
    }

    const { productId, phoneNumber, quantity } = validation.data;

    console.log(`[${requestId}] Creating order for agent ${agentId}`);
    console.log(`[${requestId}] Product: ${productId}, Phone: ${phoneNumber}, Qty: ${quantity}`);

    // Validate phone number format
    const phoneValidation = normalizePhoneNumber(phoneNumber);
    if (!phoneValidation.success) {
      return sendError(
        res,
        "INVALID_PHONE",
        phoneValidation.error || "Invalid phone number format",
        400
      );
    }

    const normalizedPhone = phoneValidation.formatted!;
    console.log(`[${requestId}] Phone normalized: ${phoneNumber} → ${normalizedPhone}`);

    // Validate product ID format (MongoDB ObjectId)
    if (!/^[a-f0-9]{24}$/.test(productId)) {
      return sendError(
        res,
        "INVALID_PRODUCT_ID",
        "productId must be a valid 24-character MongoDB ObjectId",
        400,
        { example: "507f1f77bcf86cd799439011" }
      );
    }

    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(
        res,
        "PRODUCT_NOT_FOUND",
        "Product not found",
        404,
        { productId }
      );
    }

    console.log(`[${requestId}] Product found: ${product.name}`);

    // Get or create agent user (for testing)
    let agent = await User.findById(agentId);
    if (!agent) {
      // Create test agent if doesn't exist
      agent = await User.create({
        username: `agent_${agentId}`,
        email: `agent_${agentId}@test.local`,
        role: "agent",
        isVerified: true,
        walletBalance: 1000, // Test balance
      });
      console.log(`[${requestId}] Created test agent: ${agent._id}`);
    }

    const price = product.agentPrice || product.userPrice;
    const totalPrice = price * quantity;

    console.log(`[${requestId}] Price: ${price}, Total: ${totalPrice}, Balance: ${agent.walletBalance}`);

    // Check balance
    if (agent.walletBalance < totalPrice) {
      return sendError(
        res,
        "INSUFFICIENT_BALANCE",
        "Not enough wallet balance",
        400,
        {
          required: totalPrice,
          available: agent.walletBalance,
          shortfall: totalPrice - agent.walletBalance,
          help: "Topup your wallet or reduce quantity",
        }
      );
    }

    // Initialize vendor order fields
    let vendorOrderId: string | undefined;
    let vendorError: string | undefined;

    if (product.vendorProductId) {
      try {
        console.log(`[${requestId}] Calling Portal-02 API...`);
        
        // Import portal02Service here to avoid circular imports
        const portal02Service = (await import("../lib/portal02")).default;
        
        const result = await portal02Service.purchaseDataBundle(
          normalizedPhone,
          product.dataAmount,
          product.network
        );
        
        if (result && result.success) {
          vendorOrderId = result.transactionId;
          console.log(`[${requestId}] Portal-02 order created: ${vendorOrderId}`);
        } else {
          vendorError = result?.error || "Unknown Portal-02 error";
          console.log(`[${requestId}] Portal-02 order failed: ${vendorError}`);
        }
      } catch (err) {
        vendorError = err instanceof Error ? err.message : "Vendor API error";
        console.warn(`[${requestId}] Vendor API failed: ${vendorError}`);
        // Don't fail - continue with order creation
      }
    }

    // Create order in database
    const order = new Order({
      userId: agent._id,
      username: agent.username,
      productId,
      network: product.network,
      type: product.type,
      productName: product.name,
      recipientPhone: normalizedPhone,
      amount: totalPrice,
      status: "pending",
      paymentMethod: "wallet",
      paymentReference: `AGENT_API_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      vendorOrderId,
      vendorProductId: product.vendorProductId,
    });

    await order.save();
    console.log(`[${requestId}] Order saved: ${order._id}`);

    // Deduct from wallet
    await User.findByIdAndUpdate(agent._id, {
      $inc: { walletBalance: -totalPrice, totalSpent: totalPrice },
    });

    console.log(`[${requestId}] Wallet updated. New balance: ${agent.walletBalance - totalPrice}`);

    return sendSuccess(
      res,
      {
        order: {
          id: order._id.toString(),
          orderId: order._id.toString(),
          status: order.status,
          phoneNumber: normalizedPhone,
          product: {
            name: product.name,
            network: product.network,
            dataAmount: product.dataAmount,
            price: price,
          },
          quantity,
          totalPrice,
          vendorOrderId: vendorOrderId || null,
          createdAt: order.createdAt.toISOString(),
        },
        requestId,
      },
      201,
      "Order created successfully"
    );
  } catch (err) {
    const requestId = (req as any).requestId;
    console.error(`[${requestId}] Error creating order:`, err);

    return sendError(
      res,
      "SERVER_ERROR",
      err instanceof Error ? err.message : "Failed to create order",
      500,
      { requestId }
    );
  }
});

/**
 * GET /agent-api/orders/:orderId
 * Get order status
 */
router.get("/orders/:orderId", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const { orderId } = req.params;

    console.log(`[${requestId}] Getting order: ${orderId}`);

    // Validate ObjectId format
    if (!/^[a-f0-9]{24}$/.test(orderId)) {
      return sendError(
        res,
        "INVALID_ORDER_ID",
        "Invalid order ID format",
        400
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return sendError(
        res,
        "ORDER_NOT_FOUND",
        "Order not found",
        404
      );
    }

    return sendSuccess(res, {
      order: {
        id: order._id.toString(),
        orderId: order._id.toString(),
        status: order.status,
        phoneNumber: order.recipientPhone,
        product: {
          name: order.productName,
          network: order.network,
          dataAmount: order.type,
        },
        price: order.amount,
        vendorOrderId: order.vendorOrderId || null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
      requestId,
    });
  } catch (err) {
    const requestId = (req as any).requestId;
    console.error(`[${requestId}] Error getting order:`, err);

    return sendError(
      res,
      "SERVER_ERROR",
      "Failed to get order",
      500,
      { requestId }
    );
  }
});

/**
 * GET /agent-api/orders
 * List orders with pagination
 */
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const agentId = (req as any).agentId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    console.log(`[${requestId}] Listing orders - Page: ${page}, Limit: ${limit}`);

    const skip = (page - 1) * limit;

    // Get total count
    const total = await Order.countDocuments({ userId: agentId });

    // Get orders
    const orders = await Order.find({ userId: agentId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return sendSuccess(res, {
      orders: orders.map((order) => ({
        id: order._id.toString(),
        orderId: order._id.toString(),
        status: order.status,
        phone: order.recipientPhone,
        product: order.productName,
        price: order.amount,
        vendorOrderId: order.vendorOrderId || null,
        createdAt: order.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      requestId,
    });
  } catch (err) {
    const requestId = (req as any).requestId;
    console.error(`[${requestId}] Error listing orders:`, err);

    return sendError(
      res,
      "SERVER_ERROR",
      "Failed to list orders",
      500,
      { requestId }
    );
  }
});

/**
 * GET /agent-api/products
 * Get available products
 */
router.get("/products", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;

    console.log(`[${requestId}] Fetching products`);

    const products = await Product.find({}).lean();

    return sendSuccess(res, {
      products: products.map((p: any) => ({
        id: p._id.toString(),
        productId: p._id.toString(),
        name: p.name,
        network: p.network,
        dataAmount: p.dataAmount,
        price: p.agentPrice || p.userPrice,
        description: p.description || `${p.dataAmount}GB valid for 30 days`,
      })),
      requestId,
    });
  } catch (err) {
    const requestId = (req as any).requestId;
    console.error(`[${requestId}] Error fetching products:`, err);

    return sendError(
      res,
      "SERVER_ERROR",
      "Failed to fetch products",
      500,
      { requestId }
    );
  }
});

/**
 * GET /agent-api/account/balance
 * Check wallet balance
 */
router.get("/account/balance", async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const agentId = (req as any).agentId;

    console.log(`[${requestId}] Getting balance for agent: ${agentId}`);

    const agent = await User.findById(agentId);
    if (!agent) {
      return sendError(
        res,
        "ACCOUNT_NOT_FOUND",
        "Agent account not found",
        404
      );
    }

    return sendSuccess(res, {
      account: {
        userId: agent._id.toString(),
        balance: agent.walletBalance,
        currency: "GHS",
      },
      requestId,
    });
  } catch (err) {
    const requestId = (req as any).requestId;
    console.error(`[${requestId}] Error getting balance:`, err);

    return sendError(
      res,
      "SERVER_ERROR",
      "Failed to get balance",
      500,
      { requestId }
    );
  }
});

export default router;
