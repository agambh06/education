import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.routes.js";
import { assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { examsRouter } from "./modules/exams/exams.routes.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use("/api/health", healthRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/exams", examsRouter);
