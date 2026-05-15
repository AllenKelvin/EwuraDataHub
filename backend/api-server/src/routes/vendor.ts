import { Router, type Request, type Response } from "express";
import allenDataHubService from "../lib/allendatahub";
import { Order } from "../models/Order";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

/**
 * POST /api/vendor/purchase
 * Purchase a data bundle from AllenDataHub
 */
router.post("/purchase", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { phoneNumber, bundleSize, network, productId } = req.body;

    if (!phoneNumber || (!bundleSize && !productId) || (!network && !productId)) {
      return res.status(400).json({
        error: "Missing required fields: phoneNumber and either productId or (bundleSize and network)",
      });
    }

    // Create order with AllenDataHub
    const result = await allenDataHubService.purchaseDataBundle({
      phoneNumber,
      productId,
      network,
      volume: bundleSize ? Number(bundleSize) : undefined,
    });

    if (!result || !result.success) {
      return res.status(400).json({
        error: result?.error || "Unknown error",
        platform: result?.platform || "AllenDataHub",
        details: result?.details || null,
      });
    }

    // Create corresponding order in our system
    const order = new Order({
      userId: user._id,
      username: user.username,
      vendorOrderId: result.orderId || result.transactionId,
      vendorReference: result.reference, // Store reference for webhook lookup
      vendorProductId: `${network}_${bundleSize}`,
      vendorPhoneNumber: phoneNumber,
      network,
      type: "data",
      productName: `${network} ${bundleSize}GB`,
      recipientPhone: phoneNumber,
      amount: result.amount || 0,
      status: "pending",
      paymentMethod: "wallet",
      paymentReference: result.reference,
      vendorStatus: result.status,
      webhookHistory: [], // Initialize empty webhook history
    });

    await order.save();
    req.log.info(
      `AllenDataHub order created. Order ID: ${order._id}, Vendor ID: ${order.vendorOrderId}`
    );

    return res.status(201).json({
      order: {
        id: order._id.toString(),
        vendorOrderId: result.transactionId,
        status: order.status,
        vendorStatus: result.status,
        amount: result.amount,
        message: result.message,
        createdAt: order.createdAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "AllenDataHub order error");
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/vendor/orders
 * Get user's AllenDataHub orders from database
 */
router.get("/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const orders = await Order.find({ userId: user._id })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments({ userId: user._id });

    return res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Get vendor orders error");
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch orders",
    });
  }
});

/**
 * GET /api/vendor/orders/:vendorOrderId
 * Get specific vendor order details from local database
 */
router.get("/orders/:vendorOrderId", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { vendorOrderId } = req.params;

    // Query the order from database
    const order = await Order.findOne({ 
      vendorOrderId,
      userId: user._id 
    });

    if (!order) {
      return res.status(404).json({ error: "Vendor order not found" });
    }

    return res.json({
      vendorOrderId: order.vendorOrderId,
      orderId: order._id.toString(),
      status: order.status,
      vendorStatus: order.vendorStatus,
      network: order.network,
      type: order.type,
      productName: order.productName,
      recipientPhone: order.recipientPhone,
      amount: order.amount,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (err) {
    req.log.error({ err }, "Get vendor order details error");
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch vendor order",
    });
  }
});

/**
 * POST /api/vendor/webhook
 * Receive webhook from vendor for order status updates
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;
    req.log.info({ payload: rawPayload }, "🔔 AllenDataHub webhook received (raw)");

    // Process and validate webhook payload using AllenDataHub
    const webhookResult = allenDataHubService.processWebhookPayload(rawPayload);
    
    if (!webhookResult.success) {
      req.log.warn(`[AllenDataHub Webhook] Invalid payload: ${webhookResult.error}`);
      return res.status(200).json({ received: true, status: "invalid_payload" });
    }

    const { orderId, reference, status } = webhookResult;
    
    if (webhookResult.event === "order.status.updated" || webhookResult.event === "order.status_update" || webhookResult.event === "order.updated" || webhookResult.event === "status.updated") {
      // Find order using multiple lookup strategies (in order of priority)
      let order = null;
      const lookupStrategies = [
        { vendorOrderId: orderId },                    // Primary: by vendor order ID
        { vendorReference: reference },               // Secondary: by vendor reference
        { paymentReference: reference },              // Tertiary: by payment reference
        { vendorOrderId: reference },                 // Fallback: reference might be the orderId
      ];

      for (const query of lookupStrategies) {
        order = await Order.findOne(query);
        if (order) {
          req.log.info(`[AllenDataHub Webhook] Order found using strategy: ${JSON.stringify(query)}`);
          break;
        }
      }

      if (order) {
        const oldStatus = order.vendorStatus;
        
        // Map AllenDataHub statuses to internal statuses
        if (status === "delivered" || status === "resolved") {
          order.status = "completed";
          order.vendorStatus = "completed";
          req.log.info(`✅ [AllenDataHub Webhook] Order ${order._id} completed. Vendor ID: ${orderId}`);
        } else if (status === "failed" || status === "cancelled" || status === "refunded") {
          order.status = "failed";
          order.vendorStatus = "failed";
          req.log.error(`❌ [AllenDataHub Webhook] Order ${order._id} failed. Vendor ID: ${orderId}. Reason: ${status}`);
        } else if (status === "processing") {
          order.status = "processing";
          order.vendorStatus = "processing";
          req.log.info(`⏳ [AllenDataHub Webhook] Order ${order._id} processing. Vendor ID: ${orderId}`);
        } else if (status === "pending") {
          order.status = "processing"; // Map pending to processing for better UX
          order.vendorStatus = "pending";
          req.log.info(`⏳ [AllenDataHub Webhook] Order ${order._id} pending. Vendor ID: ${orderId}`);
        }

        // Record webhook in history
        if (!order.webhookHistory) order.webhookHistory = [];
        order.webhookHistory.push({
          status,
          timestamp: webhookResult.timestamp,
          rawPayload: rawPayload,
        });

        await order.save();
        req.log.info(`[AllenDataHub Webhook] Order ${order._id} updated: ${oldStatus} → ${status}`);
      } else {
        req.log.warn(`[AllenDataHub Webhook] ⚠️ No local order found for vendor order: ${orderId}. Reference: ${reference}. Tried lookups: ${JSON.stringify(lookupStrategies)}`);
        req.log.warn(`[AllenDataHub Webhook] Webhook payload for debugging:`, rawPayload);
      }
    } else {
      req.log.warn(`[AllenDataHub Webhook] Unknown event type: ${webhookResult.event}`);
    }

    // Always respond with 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (err) {
    req.log.error({ err }, "AllenDataHub webhook error");
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * GET /api/vendor/status
 * Check vendor service health
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    // Try to fetch products to verify connection
    const products = await allenDataHubService.getProducts();

    return res.json({
      status: "online",
      message: "Vendor service is operational",
      productsCount: products.length,
    });
  } catch (err) {
    req.log.error({ err }, "Vendor status check failed");
    return res.json({
      status: "error",
      message:
        err instanceof Error ? err.message : "Failed to reach vendor service",
    });
  }
});

export default router;
