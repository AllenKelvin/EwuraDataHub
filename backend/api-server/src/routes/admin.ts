import { Router, type Request, type Response } from "express";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { WalletTransaction } from "../models/WalletTransaction";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";

const router = Router();

router.get("/stats", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      totalAgents,
      verifiedAgents,
      totalUsers,
      recentOrdersDocs,
      revenue,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "completed" }),
      Order.countDocuments({ status: "pending" }),
      User.countDocuments({ role: "agent" }),
      User.countDocuments({ role: "agent", isVerified: true }),
      User.countDocuments({ role: "user" }),
      Order.find().sort({ createdAt: -1 }).limit(10),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    return res.json({
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue: revenue[0]?.total || 0,
      totalAgents,
      verifiedAgents,
      totalUsers,
      recentOrders: recentOrdersDocs.map((o) => ({
        id: o._id.toString(),
        userId: o.userId.toString(),
        username: o.username,
        network: o.network,
        type: o.type,
        productName: o.productName,
        recipientPhone: o.recipientPhone,
        amount: o.amount,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentReference: o.paymentReference,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/orders", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, network, limit = 20, page = 1 } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (network) filter.network = network;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      orders: orders.map((o) => ({
        id: o._id.toString(),
        userId: o.userId.toString(),
        username: o.username,
        network: o.network,
        type: o.type,
        productName: o.productName,
        recipientPhone: o.recipientPhone,
        amount: o.amount,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentReference: o.paymentReference,
        createdAt: o.createdAt,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    req.log.error({ err }, "Admin orders error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/agents", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    // Always return all agents (both pending and approved) regardless of verification status
    const filter: any = { role: "agent" };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(filter);
    const agents = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      agents: agents.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isVerified: u.isVerified,
        walletBalance: u.walletBalance,
        createdAt: u.createdAt,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    req.log.error({ err }, "Admin agents error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/agents/:id/verify", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { isVerified } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Agent not found" });
    }

    return res.json({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      walletBalance: user.walletBalance,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Verify agent error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/agents/:id/balance", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount, type, reason } = req.body;

    if (!amount || !type || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const increment = type === "credit" ? amount : -amount;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { walletBalance: increment } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const reference = `ADMIN-${type.toUpperCase()}-${Date.now()}`;
    await WalletTransaction.create({
      userId: user._id,
      type,
      amount: Math.abs(amount),
      description: `Admin ${type}: ${reason}`,
      reference,
    });

    return res.json({
      balance: user.walletBalance,
      userId: user._id.toString(),
      totalFunded: user.totalFunded || 0,
      totalSpent: user.totalSpent || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Adjust balance error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
