import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";

import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { authLimiter, apiLimiter } from "./middleware/rateLimitMiddleware.js";
import { setIO } from "./utils/socket.js";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import affiliateRoutes from "./routes/affiliateRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import sitemapRoutes from "./routes/sitemapRoutes.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((o) => o.trim());

async function start() {
  await connectDB();

  const app = express();

  // ---- Security hardening ----
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // allow serving /uploads images cross-origin
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json());
  app.use(mongoSanitize()); // strips $/. keys from req.body/query — blocks NoSQL injection
  app.use("/api", apiLimiter);
  app.use("/api/auth", authLimiter);

  // Serve uploaded product images (e.g. /uploads/169999-image.jpg)
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.get("/", (req, res) => res.json({ status: "SOALECT API is running" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/affiliates", affiliateRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use(sitemapRoutes); // serves GET /sitemap.xml at the domain root, not under /api

  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);

  // ---- Socket.io: live sync between the storefront and the admin panel ----
  const io = new SocketIOServer(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("join:admin", () => socket.join("admin"));
    socket.on("join:user", (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });
  });

  setIO(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 SOALECT API + Socket.io running on http://localhost:${PORT}`);
  });
}

start();
