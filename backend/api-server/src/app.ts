import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./lib/mongodb";
import { seedAdminAccounts } from "./lib/seed";

const app: Express = express();

// Non-blocking MongoDB connection and seeding
connectMongoDB()
  .then(() => seedAdminAccounts())
  .catch((err) => {
    logger.warn({ err }, "MongoDB initialization skipped - running in memory mode");
  });

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Security: Trust proxy in production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// CORS Configuration - Production safe
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
}));

// Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});

// Request size limits to prevent DoS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const sessionSecret = process.env.SESSION_SECRET || "ewura-hub-dev-secret-change-in-prod";

if (process.env.NODE_ENV === "production" && sessionSecret === "ewura-hub-dev-secret-change-in-prod") {
  logger.warn("⚠️  WARNING: Using default SESSION_SECRET in production! Please set SESSION_SECRET environment variable.");
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
  },
}));

// Root route - API info
app.get("/", (_req, res) => {
  res.json({
    name: "Ewura Hub API",
    status: "running",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    endpoints: "/api",
  });
});

app.use("/api", router);

export default app;
