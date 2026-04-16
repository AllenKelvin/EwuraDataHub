import { Router, type Request, type Response } from "express";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { WalletTransaction } from "../models/WalletTransaction";
import { Package } from "../models/Package";
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
  console.warn("⚠ Vendor API client initialization failed in payments route");
  vendorClient = null;
}

router.post("/initialize", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order || order.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: "Order not found" });
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return res.status(503).json({ error: "Payment service not configured" });
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(order.amount * 100),
        reference: order.paymentReference,
      }),
    });

    const data = await paystackRes.json() as any;
    if (!data.status) {
      return res.status(400).json({ error: "Payment initialization failed" });
    }

    return res.json({
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (err) {
    req.log.error({ err }, "Initialize payment error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/verify/:reference", requireAuth, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackKey) {
      return res.status(503).json({ error: "Payment service not configured" });
    }

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });

    const data = await paystackRes.json() as any;

    if (!data.status || data.data.status !== "success") {
      return res.json({ status: "failed", message: "Payment not successful" });
    }

    const order = await Order.findOne({ paymentReference: reference });
    if (order && order.status === "pending") {
      // Try to call vendor API if this is a product order (not wallet fund)
      if (vendorClient && order.paymentMethod === "paystack" && !data.data.metadata?.type) {
        try {
          const product = await Package.findById(order.productId);
          const vendorProductId = product?.vendorProductId;
          
          if (vendorProductId && VendorAPIClient.validatePhoneNumber(order.recipientPhone)) {
            const formattedPhone = VendorAPIClient.formatPhoneNumber(order.recipientPhone);
            req.log.info(`Calling vendor API for Paystack order. Product: ${order.productId}, Phone: ${order.recipientPhone} → ${formattedPhone}`);
            const vendorResponse = await vendorClient.createOrder(vendorProductId, formattedPhone);
            order.vendorOrderId = vendorResponse.order.id;
            order.vendorProductId = vendorProductId;
            // Set to processing while vendor fulfills
            order.status = "processing";
            req.log.info(`Vendor order created successfully. Vendor Order ID: ${order.vendorOrderId}`);
          } else if (!vendorProductId) {
            req.log.warn(`Cannot call vendor API: Product ${order.productId} does not have vendorProductId`);
            // Mark as completed if no vendor API
            order.status = "completed";
          }
        } catch (vendorErr) {
          req.log.warn({ err: vendorErr }, `Vendor API call failed for Paystack order: ${vendorErr instanceof Error ? vendorErr.message : "unknown error"}`);
          // Still mark as completed even if vendor API fails
          order.status = "completed";
        }
      } else {
        // Mark as completed if it's a wallet fund or no vendor client
        order.status = "completed";
      }

      await order.save();

      const metadata = data.data.metadata;
      if (metadata?.type === "wallet_fund") {
        const amount = Number(data.data.amount) / 100;
        await User.findByIdAndUpdate(metadata.userId, {
          $inc: { walletBalance: amount, totalFunded: amount },
        });
        await WalletTransaction.create({
          userId: metadata.userId,
          type: "credit",
          amount,
          description: `Wallet funded via Paystack`,
          reference,
        });
      }
    }

    return res.json({
      status: "success",
      message: "Payment verified",
      order: order ? {
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
      } : undefined,
    });
  } catch (err) {
    req.log.error({ err }, "Verify payment error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const event = req.body;
    req.log.info({ event: event.event }, "Paystack webhook received");

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const order = await Order.findOne({ paymentReference: reference });
      if (order && order.status === "pending") {
        // Try to call vendor API if this is a product order (not wallet fund)
        if (vendorClient && order.paymentMethod === "paystack" && !event.data.metadata?.type) {
          try {
            const product = await Package.findById(order.productId);
            const vendorProductId = product?.vendorProductId;
            
            if (vendorProductId && VendorAPIClient.validatePhoneNumber(order.recipientPhone)) {
              const formattedPhone = VendorAPIClient.formatPhoneNumber(order.recipientPhone);
              req.log.info(`Calling vendor API for webhook order. Product: ${order.productId}, Phone: ${order.recipientPhone} → ${formattedPhone}`);
              const vendorResponse = await vendorClient.createOrder(vendorProductId, formattedPhone);
              order.vendorOrderId = vendorResponse.order.id;
              order.vendorProductId = vendorProductId;
              // Set to processing while vendor fulfills
              order.status = "processing";
              req.log.info(`Vendor order created via webhook. Vendor Order ID: ${order.vendorOrderId}`);
            } else if (!vendorProductId) {
              req.log.warn(`Cannot call vendor API: Product ${order.productId} does not have vendorProductId`);
              // Mark as completed if no vendor API
              order.status = "completed";
            }
          } catch (vendorErr) {
            req.log.warn({ err: vendorErr }, `Vendor API call failed for webhook order: ${vendorErr instanceof Error ? vendorErr.message : "unknown error"}`);
            // Still mark as completed even if vendor API fails
            order.status = "completed";
          }
        } else {
          // Mark as completed if it's a wallet fund or no vendor client
          order.status = "completed";
        }

        await order.save();
      }

      const metadata = event.data.metadata;
      if (metadata?.type === "wallet_fund") {
        const amount = Number(event.data.amount) / 100;
        await User.findByIdAndUpdate(metadata.userId, {
          $inc: { walletBalance: amount, totalFunded: amount },
        });
        await WalletTransaction.create({
          userId: metadata.userId,
          type: "credit",
          amount,
          description: "Wallet funded via Paystack",
          reference,
        });
      }
    }

    return res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Webhook error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
