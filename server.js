import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./src/routes/auth.js";
import productRoutes from "./src/routes/products.js";
import categoryRoutes from "./src/routes/categories.js";
import orderRoutes from "./src/routes/orders.js";
import reportRoutes from "./src/routes/reports.js";
import integrationRoutes from "./src/routes/integrations.js";
import { seedAdmin } from "./src/seed.js";

const requiredEnv = ["MONGODB_URI", "JWT_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters long.");
  process.exit(1);
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters long.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "MyPOS API" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/integrations", integrationRoutes);
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const port = process.env.PORT || 5000;
try {
  await mongoose.connect(process.env.MONGODB_URI);
  await seedAdmin();
  app.listen(port, () => console.log(`MyPOS running at http://localhost:${port}`));
} catch (err) {
  console.error("Startup failed:", err.message);
  process.exit(1);
}
