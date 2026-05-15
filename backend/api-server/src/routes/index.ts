import { Router } from "express";
import health from "./health";
import auth from "./auth";
import products from "./products";
import orders from "./orders";
import wallet from "./wallet";
import payments from "./payments";
import paystack from "./paystack";
import admin from "./admin";
import vendor from "./vendor";
import allenDataHub from "./allendatahub";

const router = Router();

router.use("/", health);
router.use("/auth", auth);
router.use("/products", products);
router.use("/orders", orders);
router.use("/wallet", wallet);
router.use("/payments", payments);
router.use("/paystack", paystack);
router.use("/admin", admin);
router.use("/vendor", vendor);
router.use("/vendor/allen-datahub", allenDataHub);

export default router;
