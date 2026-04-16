import { Router, type Request, type Response } from "express";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { Package } from "../models/Package";
import { WalletTransaction } from "../models/WalletTransaction";
import { requireAuth } from "../lib/auth-middleware";
import VendorAPIClient from "../lib/vendor-api";

const router = Router();

// Initialize vendor API client
let vendorClient: VendorAPIClient | null = null;
try {
  vendorClient = new VendorAPIClient(
    process.env.VENDOR_API_KEY,
    process.env.VENDOR_API_URL
  );
} catch (err) {
  console.warn("⚠ Vendor API client initialization failed in orders route");
  vendorClient = null;
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, network, limit = 20, page = 1 } = req.query;

    const filter: any = {};
    if (user.role !== "admin") {
      filter.userId = user._id;
    }
    if (status) filter.status = status;
    if (network) filter.network = network;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      orders: orders.map(formatOrder),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    req.log.error({ err }, "Get orders error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { productId, recipientPhone, paymentMethod } = req.body;

    if (!productId || !recipientPhone || !paymentMethod) {
      return res.status(400).json({ error: "Missing required fields: productId, recipientPhone, paymentMethod" });
    }

    // Fetch product from database instead of static data
    const product = await Package.findById(productId);
    if (!product) {
      return res.status(400).json({ error: `Product with ID '${productId}' not found in database` });
    }

    const isAgent = user.role === "agent" || user.role === "admin";
    const price = isAgent ? product.agentPrice : product.userPrice;

    if (paymentMethod === "wallet") {
      if (!isAgent) {
        return res.status(403).json({ error: "Wallet payment is only available for agents" });
      }
      if (!user.isVerified) {
        return res.status(403).json({ error: "Your agent account must be verified to use wallet" });
      }
      if (user.walletBalance < price) {
        return res.status(400).json({ error: `Insufficient wallet balance. Required: ${price}, Available: ${user.walletBalance}` });
      }

      const reference = `WALLET-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Initialize vendor order fields
      let vendorOrderId: string | undefined;
      let vendorProductId = product.vendorProductId;
      let vendorError: string | undefined;

      // Call vendor API if configured and product has vendor ID
      if (vendorClient && vendorProductId && VendorAPIClient.validatePhoneNumber(recipientPhone)) {
        try {
          req.log.info(`Calling vendor API for wallet payment. Product: ${productId}, Phone: ${recipientPhone}`);
          const vendorResponse = await vendorClient.createOrder(vendorProductId, recipientPhone);
          vendorOrderId = vendorResponse.order.id;
          req.log.info(`Vendor order created successfully. Vendor Order ID: ${vendorOrderId}`);
        } catch (vendorErr) {
          vendorError = vendorErr instanceof Error ? vendorErr.message : "Vendor API error";
          req.log.warn({ err: vendorErr }, `Vendor API call failed: ${vendorError}`);
          // Continue with order creation even if vendor API fails
        }
      } else if (vendorClient && !vendorProductId) {
        req.log.warn(`Cannot call vendor API: Product ${productId} does not have vendorProductId`);
      }

      const order = new Order({
        userId: user._id,
        username: user.username,
        productId,
        network: product.network,
        type: product.type,
        productName: product.name,
        recipientPhone,
        amount: price,
        status: "processing", // Start as processing to sync with vendor
        paymentMethod: "wallet",
        paymentReference: reference,
        vendorOrderId,
        vendorProductId,
      });
      await order.save();

      await User.findByIdAndUpdate(user._id, {
        $inc: { walletBalance: -price, totalSpent: price },
      });

      await WalletTransaction.create({
        userId: user._id,
        type: "debit",
        amount: price,
        description: `Purchase: ${product.name} for ${recipientPhone}`,
        reference,
      });

      req.log.info(`Order placed successfully. Order ID: ${order._id}, Reference: ${reference}${vendorOrderId ? `, Vendor Order ID: ${vendorOrderId}` : ""}`);
      return res.status(201).json({
        order: formatOrder(order),
        message: vendorOrderId ? "Order placed - processing via vendor" : "Order placed - awaiting processing",
        vendorOrderId,
        vendorError,
      });
    }

    if (paymentMethod !== "paystack") {
      return res.status(400).json({ error: `Invalid payment method: '${paymentMethod}'. Use 'wallet' or 'paystack'` });
    }

    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const order = new Order({
      userId: user._id,
      username: user.username,
      productId,
      network: product.network,
      type: product.type,
      productName: product.name,
      recipientPhone,
      amount: price,
      status: "pending",
      paymentMethod: "paystack",
      paymentReference: reference,
    });
    await order.save();
    req.log.info(`Order created with pending payment. Order ID: ${order._id}, Reference: ${reference}`);

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    let paymentUrl: string | undefined;
    let paystackError: string | undefined;

    if (paystackKey && paystackKey !== "sk_test_placeholder") {
      try {
        const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            amount: Math.round(price * 100),
            reference,
            metadata: { orderId: order._id.toString(), productName: product.name },
          }),
        });

        const paystackData = await paystackRes.json() as any;
        if (paystackData.status && paystackData.data?.authorization_url) {
          paymentUrl = paystackData.data.authorization_url;
          req.log.info(`Paystack payment URL generated: ${paymentUrl}`);
        } else {
          paystackError = paystackData.message || "Failed to initialize Paystack payment";
          req.log.warn(`Paystack initialization failed: ${paystackError}`);
        }
      } catch (err) {
        paystackError = err instanceof Error ? err.message : "Paystack connection error";
        req.log.warn({ err }, "Paystack initialization error");
      }
    } else {
      req.log.info("Paystack not configured with valid key, order created but payment URL not available");
    }

    return res.status(201).json({
      order: formatOrder(order),
      paymentUrl,
      paymentError: paystackError,
      reference,
      message: paymentUrl 
        ? "Redirect to payment" 
        : "Order created successfully - Paystack payment not available, please complete manual payment",
    });
  } catch (err) {
    req.log.error({ err }, "Create order error");
    const errorMessage = err instanceof Error ? err.message : "Failed to create order";
    return res.status(500).json({ error: errorMessage });
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (user.role !== "admin" && order.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Get order error");
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/orders/:id/sync
 * Sync order status with vendor API
 */
router.post("/:id/sync", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (user.role !== "admin" && order.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Only sync if there's a vendor order ID
    if (!order.vendorOrderId || !vendorClient) {
      return res.json({
        message: "No vendor order to sync",
        order: formatOrder(order),
      });
    }

    try {
      // Get vendor order details
      const vendorOrder = await vendorClient.getOrderDetails(order.vendorOrderId);
      
      // Map vendor status to our status
      const vendorStatus = vendorOrder.order.status;
      if (vendorStatus === "completed") {
        order.status = "completed";
        order.vendorStatus = vendorStatus;
      } else if (vendorStatus === "processing") {
        order.status = "processing";
        order.vendorStatus = vendorStatus;
      } else if (vendorStatus === "failed") {
        order.status = "failed";
        order.vendorStatus = vendorStatus;
      }

      await order.save();
      req.log.info(`Order synced with vendor. Order ID: ${order._id}, Vendor Status: ${vendorStatus}`);

      return res.json({
        message: "Order synced successfully",
        order: formatOrder(order),
      });
    } catch (vendorErr) {
      req.log.warn({ err: vendorErr }, `Failed to sync with vendor: ${vendorErr instanceof Error ? vendorErr.message : "unknown error"}`);
      return res.status(500).json({
        error: "Failed to sync with vendor",
      });
    }
  } catch (err) {
    req.log.error({ err }, "Sync order error");
    return res.status(500).json({ error: "Server error" });
  }
});

function formatOrder(order: any) {
  return {
    id: order._id.toString(),
    userId: order.userId.toString(),
    username: order.username,
    network: order.network,
    type: order.type,
    productName: order.productName,
    recipientPhone: order.recipientPhone,
    amount: order.amount,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    vendorOrderId: order.vendorOrderId,
    vendorStatus: order.vendorStatus,
    createdAt: order.createdAt,
  };
}

export { formatOrder };
export default router;
