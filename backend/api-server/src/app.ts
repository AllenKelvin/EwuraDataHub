import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import MongoStore from "connect-mongo";
import router from "./routes";
import agentApiRouter from "./routes/agent-api";
import { logger } from "./lib/logger";
import { connectMongoDB, mongoose } from "./lib/mongodb";
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
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174,http://localhost:5175").split(",").map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Otherwise reject
    callback(new Error(`CORS not allowed from origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  exposedHeaders: ["Content-Length"],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
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

const sessionSecret = process.env.SESSION_SECRET || "allendatahub-super-secret-jwt-key-2024-for-ghana";

if (process.env.NODE_ENV === "production" && sessionSecret === "allendatahub-super-secret-jwt-key-2024-for-ghana") {
  logger.warn("⚠️  WARNING: Using default SESSION_SECRET in production! Please set SESSION_SECRET environment variable.");
}

// Session store - uses MongoDB if URI is configured
let sessionStore: any;
if (process.env.MONGODB_URI) {
  sessionStore = new MongoStore({
    mongoUrl: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB || "allen-datahub",
    collection: "sessions",
    touchAfter: 24 * 3600, // Lazy session update (touch every 24 hours)
    connectionOptions: {
      maxPoolSize: 10,
      minPoolSize: 2,
    },
  });
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
    path: "/",
  },
}));

// Root route - API info
app.get("/", (_req, res) => {
  res.json({
    name: "Allen DataHub API",
    status: "running",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    endpoints: "/api",
  });
});

// Main API routes
app.use("/api", router);

// Agent API v2.0 routes
app.use("/agent-api", agentApiRouter);

export default app;
