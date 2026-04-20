import { Router, type Request, type Response } from "express";
import { createHmac } from "crypto";
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
    const user = (req as any).user;
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

    // Check if order already exists
    let order = await Order.findOne({ paymentReference: reference });
    
    const metadata = data.data.metadata;
    
    // Handle wallet fund transactions (no Order created for these)
    if (metadata?.type === "wallet_fund") {
      const amount = metadata.amount; // Use metadata amount (without 4% fee)
      const userId = metadata.userId;
      const adminFee = metadata.adminFee;
      const totalCharged = metadata.totalChargeAmount;
      
      req.log.info(`Payment verification: Processing wallet fund: ${amount} (with ${adminFee} admin fee, total: ${totalCharged}) for user ${userId}`);
      
      try {
        await User.findByIdAndUpdate(userId, {
          $inc: { walletBalance: amount, totalFunded: amount },
        });
        
        // Check if transaction already exists to prevent duplicates
        const existingTx = await WalletTransaction.findOne({ reference });
        if (!existingTx) {
          await WalletTransaction.create({
            userId,
            type: "credit",
            amount,
            description: `Wallet funded via Paystack (4% fee: ${adminFee})`,
            reference,
          });
        }
        
        req.log.info(`✅ Payment verification: Wallet fund successful: ${amount} credited to user ${userId} (Fee: ${adminFee})`);
        return res.json({
          status: "success",
          message: "Wallet funded successfully",
          wallet: {
            userId,
            amount,
            adminFee,
            totalCharged,
            type: "credit",
            reference,
          },
        });
      } catch (walletErr) {
        req.log.error({ err: walletErr }, `Payment verification: Wallet fund failed`);
        return res.json({ status: "failed", message: "Wallet fund failed" });
      }
    }
    
    if (!order) {
      // Order doesn't exist - create it from Paystack metadata
      req.log.info(`Payment verification: Creating order from Paystack metadata. Reference: ${reference}`);
      
      try {
        const userId = metadata?.userId || user._id.toString();
        const productId = metadata?.productId;
        const recipientPhone = metadata?.recipientPhone;
        const productName = metadata?.productName;
        const username = metadata?.username || user.username;
        const idempotencyKey = metadata?.idempotencyKey;

        if (!productId || !recipientPhone) {
          req.log.error(`Payment verification: Missing metadata for order creation`, { metadata });
          return res.json({ status: "success", message: "Payment verified but order creation failed" });
        }

        const product = await Product.findById(productId);
        if (!product) {
          req.log.warn(`Payment verification: Product ${productId} not found`);
          return res.json({ status: "success", message: "Payment verified but product not found" });
        }

        const amount = Number(data.data.amount) / 100;

        // Create order
        order = new Order({
          userId,
          username,
          productId,
          network: product.network,
          type: product.type,
          productName: product.name,
          recipientPhone,
          amount,
          status: "pending",
          paymentMethod: "paystack",
          paymentReference: reference,
          idempotencyKey,
        });
        await order.save();
        req.log.info(`Payment verification: Order created successfully. Order ID: ${order._id}`);
      } catch (createErr) {
        req.log.error({ err: createErr }, `Payment verification: Failed to create order`);
        return res.json({ status: "success", message: "Payment verified but order creation failed" });
      }
    }

    // Update order status and call vendor if needed
    if (order.status === "pending") {
      req.log.info(`Payment verification: Order ${order._id} payment confirmed, processing...`);
      
      // Try to call vendor API if this is a product order
      if (order.paymentMethod === "paystack" && order.productId) {
        try {
          const product = await Product.findById(order.productId);
          if (!product) {
            req.log.warn(`Payment verification: Product ${order.productId} not found`);
            order.status = "completed";
            await order.save();
            return res.json({
              status: "success",
              message: "Payment verified",
              order: {
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
              },
            });
          }
          
          const vendorProductId = product.vendorProductId || `${product.network}_${product.dataAmount}`;
          
          if (validatePhoneNumber(order.recipientPhone)) {
            const formattedPhone = formatPhoneNumber(order.recipientPhone);
            req.log.info(`Payment verification: Calling Portal-02 for order ${order._id}. Phone: ${order.recipientPhone} → ${formattedPhone}`);
            
            const result = await portal02Service.purchaseDataBundle(
              formattedPhone,
              product.dataAmount,
              product.network
            );
            
            if (result && result.success) {
              order.vendorOrderId = result.transactionId;
              order.vendorProductId = vendorProductId;
              order.vendorStatus = result.status || "pending";
              order.status = "processing";
              req.log.info(`✅ Payment verification: Portal-02 order created successfully. Vendor Order ID: ${result.transactionId}`);
            } else {
              req.log.warn(`❌ Payment verification: Portal-02 API failed: ${result?.error || "Unknown error"}`);
              // Mark order as failed when Portal-02 fails (e.g., no balance, invalid phone)
              order.status = "failed";
            }
          } else {
            req.log.warn(`Payment verification: Invalid phone number: ${order.recipientPhone}`);
            order.status = "failed";
          }
        } catch (vendorErr) {
          req.log.warn({ err: vendorErr }, `Payment verification: Portal-02 call failed: ${vendorErr instanceof Error ? vendorErr.message : "unknown error"}`);
          // Mark order as failed if Portal-02 call fails
          order.status = "failed";
        }
      } else {
        order.status = "completed";
      }

      await order.save();
    }

    return res.json({
      status: "success",
      message: "Payment verified",
      order: {
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
      },
    });
  } catch (err) {
    req.log.error({ err }, "Verify payment error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    // Verify Paystack signature for security
    const hash = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || "").update(JSON.stringify(req.body)).digest('hex');
    const paystackSignature = req.headers['x-paystack-signature'] as string;
    
    if (hash !== paystackSignature) {
      req.log.warn({ receivedHash: hash, receivedSig: paystackSignature }, "Invalid Paystack webhook signature");
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const event = req.body;
    req.log.info({ event: event.event, reference: event.data?.reference }, "✅ Paystack webhook received (signature verified)");

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const metadata = event.data.metadata;
      req.log.info(`[Paystack Webhook] Processing charge.success for reference: ${reference}`);
      
      // Handle wallet fund transactions (no Order created for these)
      if (metadata?.type === "wallet_fund") {
        const amount = metadata.amount; // Use metadata amount (without 4% fee)
        const userId = metadata.userId;
        const adminFee = metadata.adminFee;
        const totalCharged = metadata.totalChargeAmount;
        
        req.log.info(`[Paystack Webhook] Processing wallet fund: ${amount} (with ${adminFee} admin fee, total: ${totalCharged}) for user ${userId}`);
        
        try {
          await User.findByIdAndUpdate(userId, {
            $inc: { walletBalance: amount, totalFunded: amount },
          });
          
          await WalletTransaction.create({
            userId,
            type: "credit",
            amount,
            description: `Wallet funded via Paystack (4% fee: ${adminFee})`,
            reference,
          });
          
          req.log.info(`✅ [Paystack Webhook] Wallet fund successful: ${amount} credited to user ${userId} (Fee: ${adminFee})`);
          return res.status(200).json({ received: true });
        } catch (walletErr) {
          req.log.error({ err: walletErr }, `[Paystack Webhook] Wallet fund failed`);
          return res.status(200).json({ received: true });
        }
      }
      
      // Handle product orders
      const order = await Order.findOne({ paymentReference: reference });
      if (!order) {
        req.log.warn(`[Paystack Webhook] No order found for reference: ${reference}`);
        return res.status(200).json({ received: true });
      }
      
      if (order.status === "pending") {
        req.log.info(`[Paystack Webhook] Order ${order._id} payment confirmed, calling Portal-02...`);
        
        // Try to call vendor API if this is a product order (not wallet fund)
        if (order.paymentMethod === "paystack" && !event.data.metadata?.type) {
          try {
            const product = await Product.findById(order.productId);
            if (!product) {
              req.log.warn(`[Paystack Webhook] Product ${order.productId} not found`);
              order.status = "completed";
              await order.save();
              return res.status(200).json({ received: true });
            }
            
            const vendorProductId = product.vendorProductId;
            
            if (vendorProductId && validatePhoneNumber(order.recipientPhone)) {
              const formattedPhone = formatPhoneNumber(order.recipientPhone);
              req.log.info(`[Paystack Webhook] Calling Portal-02 for order ${order._id}. Phone: ${order.recipientPhone} → ${formattedPhone}`);
              
              const result = await portal02Service.purchaseDataBundle(
                formattedPhone,
                product.dataAmount,
                product.network
              );
              
              if (result && result.success) {
                order.vendorOrderId = result.transactionId;
                order.vendorProductId = vendorProductId;
                order.vendorStatus = "pending";
                order.status = "processing";
                req.log.info(`✅ [Paystack Webhook] Portal-02 order created successfully. Vendor Order ID: ${result.transactionId}`);
              } else {
                req.log.warn(`❌ [Paystack Webhook] Portal-02 API failed: ${result?.error || "Unknown error"}`);
                order.status = "completed";
              }
            } else if (!vendorProductId) {
              req.log.warn(`[Paystack Webhook] Cannot call Portal-02: Product ${order.productId} does not have vendorProductId`);
              order.status = "completed";
            } else {
              req.log.warn(`[Paystack Webhook] Invalid phone number: ${order.recipientPhone}`);
              order.status = "completed";
            }
          } catch (vendorErr) {
            req.log.warn({ err: vendorErr }, `[Paystack Webhook] Portal-02 call failed: ${vendorErr instanceof Error ? vendorErr.message : "unknown error"}`);
            order.status = "completed";
          }
        } else {
          // Mark as completed if it's a wallet fund or no product
          req.log.info(`[Paystack Webhook] Non-product order, marking as completed`);
          order.status = "completed";
        }

        await order.save();
        req.log.info(`[Paystack Webhook] Order ${order._id} saved with status: ${order.status}`);
      } else {
        req.log.warn(`[Paystack Webhook] Order already processed. Current status: ${order.status}`);
      }

      return res.json({ received: true });
    }

    return res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Webhook error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
