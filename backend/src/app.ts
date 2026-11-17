import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { env } from "./config/env.js";
import { assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { examsRouter } from "./modules/exams/exams.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use("/api/health", healthRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/exams", examsRouter);
app.use("/api", (_request, response) => {
  response.status(404).json({ message: "API route not found" });
});

const handleError: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
      ? error.status
      : 500;

  response.status(status).json({ message: status < 500 ? "Invalid request" : "Internal server error" });
};

app.use(handleError);
