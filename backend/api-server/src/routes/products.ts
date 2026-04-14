import { Router, type Request, type Response } from "express";
import { Package } from "../models/Package";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { network } = req.query;
    let filter: Record<string, any> = {};

    if (network) {
      filter.network = network;
    }

    // Try to fetch from MongoDB first, fallback to empty array if no connection
    let packages: any[] = [];
    try {
      packages = await Package.find(filter).lean();
    } catch (err) {
      // If MongoDB is not available, return empty array
      packages = [];
    }

    return res.json(packages);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

export default router;
