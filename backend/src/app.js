import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import globalErrorHandler from "./core/errorHandler.js";
import notFoundHandler from "./core/notFound.js";
import sendResponse from "./core/sendResponse.js";
import authRoutes from "./modules/auth/auth.routes.js";
import financeRoutes from "./modules/finance/finance.routes.js";
import matchRoutes from "./modules/match/match.routes.js";
import notificationRoutes from "./modules/notification/notification.routes.js";
import teamRoutes from "./modules/team/team.routes.js";

const app = express();

const corsOrigin =
  env.CORS_ORIGIN === "*"
    ? true
    : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.get("/api/health", (req, res) => {
  sendResponse(res, {
    statusCode: 200,
    message: "Football Team Management API is healthy.",
    data: {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: env.NODE_ENV,
    },
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/v1/matches", matchRoutes);
app.use("/api/v1/finances", financeRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;