import { Router } from "express";
import { checkDatabase, database } from "../config/database.js";

export function createHealthRouter(probe: () => Promise<void> = () => checkDatabase(database())) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  router.get("/ready", async (_request, response) => {
    response.set("Cache-Control", "no-store");
    try {
      await probe();
      response.status(200).json({ status: "ok" });
    } catch {
      response.status(503).json({ status: "unavailable" });
    }
  });

  return router;
}

export const healthRouter = createHealthRouter();
