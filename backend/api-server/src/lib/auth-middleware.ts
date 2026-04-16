import { type Request, type Response, type NextFunction } from "express";
import { User } from "../models/User";
import { extractTokenFromHeader, verifyToken } from "./jwt";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  let userId: string | null = null;

  // First, try to get userId from session (backward compatibility)
  if (req.session?.userId) {
    userId = req.session.userId;
  } else {
    // Try to get from JWT token in Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }
  }

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    (req as any).user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Authentication failed" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

export function requireAgent(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== "agent" && user.role !== "admin")) {
    return res.status(403).json({ error: "Agent access required" });
  }
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}
