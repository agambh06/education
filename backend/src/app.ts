import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { env } from "./config/env.js";
import { prisma } from "./db.js";
import { assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { requireAuth, resolveAuthenticatedUser, resolveAuthenticatedUserId } from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { examsRouter } from "./modules/exams/exams.routes.js";
import { createLearningRemindersRouter } from "./modules/notifications/learning-reminders.routes.js";
import { LearningReminderPreferencesService } from "./modules/notifications/learning-reminders.service.js";
import { learningReminderPreferenceStore } from "./modules/notifications/learning-reminders.store.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { createParentLinksRouter, type ParentLinksOptions } from "./modules/parent-links/parent-links.routes.js";
import { healthRouter } from "./routes/health.routes.js";

type AppOptions =
  | ParentLinksOptions
  | { parentLinksOptions?: ParentLinksOptions; resolveAuthenticatedUser?: typeof resolveAuthenticatedUser };

export function createApp(options: AppOptions = {}) {
  const app = express();
  const resolveUser =
    "resolveAuthenticatedUser" in options
      ? (options.resolveAuthenticatedUser ?? resolveAuthenticatedUser)
      : resolveAuthenticatedUser;
  const parentLinksOptions: ParentLinksOptions | undefined =
    "parentLinksOptions" in options ? options.parentLinksOptions : "prisma" in options ? options : undefined;
  const resolveUserId = async (request: express.Request) => (await resolveUser(request))?.userId ?? null;

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/assignments", requireAuth(resolveUser), assignmentsRouter);
  app.use("/api/notifications", requireAuth(resolveUser), notificationsRouter);
  app.use("/api/exams", requireAuth(resolveUser), examsRouter);
  app.use(
    "/api/parent-reminders",
    createLearningRemindersRouter({
      service: new LearningReminderPreferencesService(learningReminderPreferenceStore),
      resolveSession: resolveUser,
    }),
  );
  app.use(
    "/api/parent-links",
    createParentLinksRouter(
      parentLinksOptions ?? {
        prisma,
        resolveUserId: "resolveAuthenticatedUser" in options ? resolveUserId : resolveAuthenticatedUserId,
      },
    ),
  );
  app.use("/api", requireAuth(resolveUser), schoolStructureRouter);
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
  return app;
}

export const app = createApp();
