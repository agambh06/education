import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { examsRouter } from "./modules/exams/exams.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/assignments", requireAuth, assignmentsRouter);
app.use("/api/notifications", requireAuth, notificationsRouter);
app.use("/api/exams", requireAuth, examsRouter);
