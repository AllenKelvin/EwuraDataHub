import { Router, type Request, type Response } from "express";
import { User } from "../models/User";
import { WalletTransaction } from "../models/WalletTransaction";
import { requireAuth, requireAgent } from "../lib/auth-middleware";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    return res.json({
      balance: user.walletBalance,
      userId: user._id.toString(),
      totalFunded: user.totalFunded || 0,
      totalSpent: user.totalSpent || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Get wallet error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/fund", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Add 4% admin fee on top of requested amount
    const ADMIN_FEE_PERCENTAGE = 0.04;
    const adminFee = amount * ADMIN_FEE_PERCENTAGE;
    const totalChargeAmount = amount + adminFee;

    const reference = `WALLET-FUND-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackKey) {
      return res.status(503).json({ error: "Payment service not configured. Please add PAYSTACK_SECRET_KEY." });
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(totalChargeAmount * 100),
        reference,
        metadata: {
          type: "wallet_fund",
          userId: user._id.toString(),
          amount, // amount to credit to wallet (without admin fee)
          adminFee, // 4% fee charged
          totalChargeAmount, // total amount charged via Paystack
        },
      }),
    });

    const data = await paystackRes.json() as any;
    if (!data.status) {
      return res.status(400).json({ error: data.message || "Payment initialization failed" });
    }

    return res.json({
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
      amount, // return original amount for UI display
      adminFee, // return fee amount for UI display
      totalChargeAmount, // return total charge for UI display
    });
  } catch (err) {
    req.log.error({ err }, "Fund wallet error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/transactions", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { limit = 20, page = 1 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await WalletTransaction.countDocuments({ userId: user._id });
    const transactions = await WalletTransaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      transactions: transactions.map((t) => ({
        id: t._id.toString(),
        type: t.type,
        amount: t.amount,
        description: t.description,
        reference: t.reference,
        createdAt: t.createdAt,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    req.log.error({ err }, "Get transactions error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
