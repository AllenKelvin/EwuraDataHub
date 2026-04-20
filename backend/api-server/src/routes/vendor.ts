import { Router, type Request, type Response } from "express";
import portal02Service from "../lib/portal02";
import { Order } from "../models/Order";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

/**
 * POST /api/vendor/purchase
 * Purchase a data bundle from Portal-02
 */
router.post("/purchase", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { phoneNumber, bundleSize, network } = req.body;

    if (!phoneNumber || !bundleSize || !network) {
      return res.status(400).json({
        error: "Missing required fields: phoneNumber, bundleSize, network",
      });
    }

    // Create order with Portal-02
    const result = await portal02Service.purchaseDataBundle(
      phoneNumber,
      bundleSize,
      network,
      user._id.toString()
    );

    if (!result || !result.success) {
      return res.status(400).json({
        error: result?.error || "Unknown error",
        platform: result?.platform || "Portal-02.com",
        details: result?.details || null,
      });
    }

    // Create corresponding order in our system
    const order = new Order({
      userId: user._id,
      username: user.username,
      vendorOrderId: result.transactionId,
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
    });

    await order.save();
    req.log.info(
      `Portal-02 order created. Order ID: ${order._id}, Portal-02 ID: ${result.transactionId}`
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
    req.log.error({ err }, "Portal-02 order error");
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/vendor/orders
 * Get user's Portal-02 orders from database
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
    req.log.info({ payload: rawPayload }, "🔔 Portal-02 webhook received (raw)");

    // Process and validate webhook payload using portal02Service
    const webhookResult = portal02Service.processWebhookPayload(rawPayload);
    
    if (!webhookResult.success) {
      req.log.warn(`[Portal-02 Webhook] Invalid payload: ${webhookResult.error}`);
      return res.status(200).json({ received: true, status: "invalid_payload" });
    }

    const { orderId, status } = webhookResult;
    
    if (webhookResult.event === "order.status.updated" || webhookResult.event === "order.status_update") {
      // Find order by vendor order ID
      const order = await Order.findOne({ vendorOrderId: orderId });

      if (order) {
        const oldStatus = order.vendorStatus;
        // Update order status
        order.vendorStatus = status;

        if (status === "delivered" || status === "completed") {
          order.status = "completed";
          req.log.info(`✅ [Portal-02 Webhook] Order ${order._id} completed. Vendor ID: ${orderId}`);
        } else if (status === "failed" || status === "cancelled" || status === "refunded") {
          order.status = "failed";
          req.log.error(`❌ [Portal-02 Webhook] Order ${order._id} failed. Vendor ID: ${orderId}. Reason: ${status}`);
        } else if (status === "processing") {
          order.status = "processing";
          req.log.info(`⏳ [Portal-02 Webhook] Order ${order._id} processing. Vendor ID: ${orderId}`);
        } else if (status === "pending") {
          order.status = "processing"; // Map pending to processing for better UX
          req.log.info(`⏳ [Portal-02 Webhook] Order ${order._id} pending. Vendor ID: ${orderId}`);
        }

        await order.save();
        req.log.info(`[Portal-02 Webhook] Order ${order._id} updated: ${oldStatus} → ${status}`);
      } else {
        req.log.warn(`[Portal-02 Webhook] ⚠️ No local order found for vendor order: ${orderId}`);
      }
    } else {
      req.log.warn(`[Portal-02 Webhook] Unknown event type: ${webhookResult.event}`);
    }

    // Always respond with 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Portal-02 webhook error");
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * GET /api/vendor/status
 * Check vendor service health
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    if (!vendorClient) {
      return res.json({
        status: "offline",
        message: "Vendor service not configured",
      });
    }

    // Try to fetch products to verify connection
    const products = await vendorClient.getProducts();

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
