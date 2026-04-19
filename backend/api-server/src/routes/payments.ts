import { Router, type Request, type Response } from "express";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { WalletTransaction } from "../models/WalletTransaction";
import { Product } from "../models/Product";
import { requireAuth } from "../lib/auth-middleware";
import portal02Service from "../lib/portal02";
import { formatPhoneNumber, validatePhoneNumber } from "../lib/phone-utils";

const router = Router();

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
      if (order.paymentMethod === "paystack" && !data.data.metadata?.type) {
        try {
          const product = await Product.findById(order.productId);
          const vendorProductId = product?.vendorProductId;
          
          if (vendorProductId && validatePhoneNumber(order.recipientPhone)) {
            const formattedPhone = formatPhoneNumber(order.recipientPhone);
            req.log.info(`Calling Portal-02 for Paystack order. Product: ${order.productId}, Phone: ${order.recipientPhone} → ${formattedPhone}`);
            
            const result = await portal02Service.purchaseDataBundle(
              formattedPhone,
              product?.dataAmount,
              product?.network
            );
            
            if (result.success) {
              order.vendorOrderId = result.transactionId;
              order.vendorProductId = vendorProductId;
              order.status = "processing";
              req.log.info(`Portal-02 order created successfully. Order ID: ${order.vendorOrderId}`);
            } else {
              req.log.warn(`Portal-02 API failed: ${result.error}`);
              order.status = "completed";
            }
          } else if (!vendorProductId) {
            req.log.warn(`Cannot call Portal-02: Product ${order.productId} does not have vendorProductId`);
            order.status = "completed";
          }
        } catch (vendorErr) {
          req.log.warn({ err: vendorErr }, `Portal-02 call failed for Paystack order: ${vendorErr instanceof Error ? vendorErr.message : "unknown error"}`);
          order.status = "completed";
        }
      } else {
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
        if (order.paymentMethod === "paystack" && !event.data.metadata?.type) {
          try {
            const product = await Product.findById(order.productId);
            const vendorProductId = product?.vendorProductId;
            
            if (vendorProductId && validatePhoneNumber(order.recipientPhone)) {
              const formattedPhone = formatPhoneNumber(order.recipientPhone);
              req.log.info(`Calling Portal-02 for webhook order. Product: ${order.productId}, Phone: ${order.recipientPhone} → ${formattedPhone}`);
              
              const result = await portal02Service.purchaseDataBundle(
                formattedPhone,
                product?.dataAmount,
                product?.network
              );
              
              if (result.success) {
                order.vendorOrderId = result.transactionId;
                order.vendorProductId = vendorProductId;
                order.status = "processing";
                req.log.info(`Portal-02 order created via webhook. Order ID: ${order.vendorOrderId}`);
              } else {
                req.log.warn(`Portal-02 API failed: ${result.error}`);
                order.status = "completed";
              }
            } else if (!vendorProductId) {
              req.log.warn(`Cannot call Portal-02: Product ${order.productId} does not have vendorProductId`);
              order.status = "completed";
            }
          } catch (vendorErr) {
            req.log.warn({ err: vendorErr }, `Portal-02 call failed for webhook order: ${vendorErr instanceof Error ? vendorErr.message : "unknown error"}`);
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
