import { Router, type Request, type Response } from "express";
import { User } from "../models/User";

const router = Router();

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, phone, password, role } = req.body;

    if (!username || !email || !phone || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }, { phone }] });
    if (existing) {
      return res.status(400).json({ error: "Username, email, or phone already in use" });
    }

    const userRole = role === "agent" ? "agent" : "user";
    const user = new User({ username, email, phone, password, role: userRole });
    await user.save();

    req.session.userId = user._id.toString();

    // Explicitly save session before sending response
    return new Promise((resolve) => {
      req.session.save((err) => {
        if (err) {
          req.log.error({ err }, "Session save error during register");
          return res.status(500).json({ error: "Session save failed" });
        }
        
        return res.status(201).json({
          user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            walletBalance: user.walletBalance,
            createdAt: user.createdAt,
          },
          message: "Account created successfully",
        });
      });
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrPhone.toLowerCase() },
        { phone: emailOrPhone },
        { username: emailOrPhone },
      ],
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user._id.toString();
    
    // Explicitly save session before sending response
    return new Promise((resolve) => {
      req.session.save((err) => {
        if (err) {
          req.log.error({ err }, "Session save error during login");
          return res.status(500).json({ error: "Session save failed" });
        }
        
        return res.status(200).json({
          user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            walletBalance: user.walletBalance,
            createdAt: user.createdAt,
          },
          message: "Login successful",
        });
      });
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Logout error");
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid", {
      path: "/",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
    });
    return res.json({ message: "Logged out" });
  });
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
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
    req.log.error({ err }, "Get me error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
