import { Router } from "express";
import health from "./health";
import auth from "./auth";
import products from "./products";
import orders from "./orders";
import wallet from "./wallet";
import payments from "./payments";
import admin from "./admin";

const router = Router();

router.use("/", health);
router.use("/auth", auth);
router.use("/products", products);
router.use("/orders", orders);
router.use("/wallet", wallet);
router.use("/payments", payments);
router.use("/admin", admin);

export default router;
