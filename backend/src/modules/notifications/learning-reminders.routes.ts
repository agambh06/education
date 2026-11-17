import { type Request, Router } from "express";
import { ZodError } from "zod";
import { learningReminderStatus } from "./learning-reminders.policy.js";
import { LearningReminderAccessError, LearningReminderPreferencesService } from "./learning-reminders.service.js";
import { learningReminderPreferenceStore } from "./learning-reminders.store.js";
import type { ReminderParentSession } from "./learning-reminders.types.js";

interface RouterDependencies {
  service: LearningReminderPreferencesService;
  // Must resolve a server-verified session, never a role/ID supplied by the caller.
  resolveSession(request: Request): ReminderParentSession | null | Promise<ReminderParentSession | null>;
}

export function createLearningRemindersRouter({ service, resolveSession }: RouterDependencies) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  router.get("/status", (_request, response) => response.json(learningReminderStatus));

  router.all("/children/:studentId/preferences", async (request, response) => {
    if (request.method !== "GET" && request.method !== "PUT") {
      response.set("Allow", "GET, PUT");
      return response.status(405).json({ message: "Method not allowed" });
    }
    try {
      const session = await resolveSession(request);
      const preferences =
        request.method === "GET"
          ? await service.getPreferences(session, request.params.studentId)
          : await service.savePreferences(session, request.params.studentId, request.body);
      return response.json({ ...preferences, deliveryEnabled: false });
    } catch (error) {
      if (error instanceof LearningReminderAccessError) {
        return response.status(error.status).json({ message: error.message });
      }
      if (error instanceof ZodError) {
        return response.status(400).json({ message: "Invalid reminder preferences" });
      }
      return response.status(503).json({ message: "Reminder preferences unavailable" });
    }
  });
  return router;
}

export const learningRemindersRouter = createLearningRemindersRouter({
  service: new LearningReminderPreferencesService(learningReminderPreferenceStore),
  // Authentication is a separate prerequisite. Reject every caller until it exists.
  resolveSession: () => null,
});
