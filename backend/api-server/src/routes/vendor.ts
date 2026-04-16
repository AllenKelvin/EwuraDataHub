import { Router, type Request, type Response } from "express";
import VendorAPIClient, { VendorProduct } from "../lib/vendor-api";
import { Order } from "../models/Order";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

// Initialize vendor API client
let vendorClient: VendorAPIClient | null = null;

try {
  vendorClient = new VendorAPIClient(
    process.env.VENDOR_API_KEY,
    process.env.VENDOR_API_URL
  );
  console.log("✓ Vendor API client initialized successfully");
} catch (err) {
  console.warn("⚠ Vendor API client initialization failed:", err instanceof Error ? err.message : String(err));
  vendorClient = null;
}

/**
 * GET /api/vendor/products
 * Get all available vendor products
 */
router.get("/products", async (req: Request, res: Response) => {
  try {
    if (!vendorClient) {
      return res.status(503).json({ error: "Vendor service not configured" });
    }

    const products = await vendorClient.getProducts();
    return res.json({ products });
  } catch (err) {
    req.log.error({ err }, "Get vendor products error");
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch vendor products",
    });
  }
});

/**
 * POST /api/vendor/orders
 * Create an order directly with vendor (auto-purchase with wallet)
 */
router.post("/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!vendorClient) {
      return res.status(503).json({ error: "Vendor service not configured" });
    }

    const user = (req as any).user;
    const { phonenumber, vendorProductId } = req.body;

    if (!phonenumber || !vendorProductId) {
      return res.status(400).json({
        error: "Missing required fields: phonenumber, vendorProductId",
      });
    }

    // Validate phone number
    if (!VendorAPIClient.validatePhoneNumber(phonenumber)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    try {
      // Create order with vendor
      const vendorResponse = await vendorClient.createOrder(
        vendorProductId,
        phonenumber
      );

      const vendorOrder = vendorResponse.order;

      // Create corresponding order in our system
      const order = new Order({
        userId: user._id,
        username: user.username,
        vendorOrderId: vendorOrder.id,
        vendorProductId,
        vendorPhoneNumber: phonenumber,
        network: vendorOrder.productNetwork,
        type: "data", // Assuming data bundles
        productName: vendorOrder.productName,
        recipientPhone: phonenumber,
        amount: vendorOrder.price,
        status: "pending",
        paymentMethod: "vendor_wallet",
        paymentReference: vendorOrder.id,
        vendorStatus: vendorOrder.status,
      });

      await order.save();
      req.log.info(
        `Vendor order created. Order ID: ${order._id}, Vendor ID: ${vendorOrder.id}`
      );

      return res.status(201).json({
        order: {
          id: order._id.toString(),
          vendorOrderId: vendorOrder.id,
          status: order.status,
          vendorStatus: vendorOrder.status,
          amount: vendorOrder.price,
          productName: vendorOrder.productName,
          walletBalanceBefore: vendorOrder.walletBalanceBefore,
          walletBalanceAfter: vendorOrder.walletBalanceAfter,
          createdAt: order.createdAt,
        },
      });
    } catch (vendorErr) {
      req.log.error({ err: vendorErr }, "Vendor order creation failed");
      return res.status(400).json({
        error: vendorErr instanceof Error ? vendorErr.message : "Vendor order failed",
      });
    }
  } catch (err) {
    req.log.error({ err }, "Create vendor order error");
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/vendor/orders
 * Get all vendor orders (paginated)
 */
router.get("/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!vendorClient) {
      return res.status(503).json({ error: "Vendor service not configured" });
    }

    const { page = 1, limit = 20 } = req.query;

    const vendorOrders = await vendorClient.getOrders(
      Number(page),
      Number(limit),
      "api"
    );

    return res.json(vendorOrders);
  } catch (err) {
    req.log.error({ err }, "Get vendor orders error");
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch vendor orders",
    });
  }
});

/**
 * GET /api/vendor/orders/:vendorOrderId
 * Get specific vendor order details
 */
router.get("/orders/:vendorOrderId", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!vendorClient) {
      return res.status(503).json({ error: "Vendor service not configured" });
    }

    const { vendorOrderId } = req.params;
    const vendorOrder = await vendorClient.getOrderDetails(vendorOrderId);

    return res.json(vendorOrder);
  } catch (err) {
    req.log.error({ err }, "Get vendor order details error");

    if (err instanceof Error && err.message.includes("404")) {
      return res.status(404).json({ error: "Vendor order not found" });
    }

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
    const { event, orderId, status, details } = req.body;

    req.log.info(
      { event, orderId, status },
      "Received vendor webhook"
    );

    if (event === "order.status_updated") {
      // Find order by vendor order ID
      const order = await Order.findOne({ vendorOrderId: orderId });

      if (order) {
        // Update order status
        order.vendorStatus = status;

        if (status === "completed") {
          order.status = "completed";
        } else if (status === "failed") {
          order.status = "failed";
        } else if (status === "processing") {
          order.status = "processing";
        }

        await order.save();
        req.log.info(`Order ${order._id} updated with vendor status: ${status}`);
      } else {
        req.log.warn(`No local order found for vendor order: ${orderId}`);
      }
    }

    // Always respond with 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Vendor webhook error");
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
