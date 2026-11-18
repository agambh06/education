import { Router, type Response } from "express";
import { z } from "zod";
import { getPrincipal } from "../../auth/authorization.js";
import { prisma } from "../../db.js";
import { createSchoolStructureService } from "./school-structure.service.js";

export const schoolStructureRouter = Router();

const classFilterSchema = z.object({
  classId: z.string().trim().min(1).max(100).optional(),
}).strict();
const schoolYearFilterSchema = z.object({
  schoolYearId: z.string().trim().min(1).max(100).optional(),
}).strict();

function parseFilters<T extends z.ZodType>(query: unknown, response: Response, schema: T): z.infer<T> | undefined {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    response.status(400).json({
      error: { code: "INVALID_QUERY", message: "Invalid query parameters", details: parsed.error.flatten() },
    });
    return undefined;
  }
  return parsed.data;
}

schoolStructureRouter.get("/students", async (request, response, next) => {
  const filters = parseFilters(request.query, response, classFilterSchema);
  if (!filters) return;
  const principal = getPrincipal(response);
  if (!principal) return response.status(401).json({ message: "Authentication required" });
  try {
    response.set("Cache-Control", "private, no-store");
    response.json(await createSchoolStructureService(prisma).listStudents(principal, filters.classId));
  } catch (error) {
    next(error);
  }
});

schoolStructureRouter.get("/classes", async (request, response, next) => {
  const filters = parseFilters(request.query, response, schoolYearFilterSchema);
  if (!filters) return;
  const principal = getPrincipal(response);
  if (!principal) return response.status(401).json({ message: "Authentication required" });
  try {
    response.set("Cache-Control", "private, no-store");
    response.json(await createSchoolStructureService(prisma).listClasses(principal, filters.schoolYearId));
  } catch (error) {
    next(error);
  }
});

schoolStructureRouter.get("/subjects", async (request, response, next) => {
  const filters = parseFilters(request.query, response, classFilterSchema);
  if (!filters) return;
  const principal = getPrincipal(response);
  if (!principal) return response.status(401).json({ message: "Authentication required" });
  try {
    response.set("Cache-Control", "private, no-store");
    response.json(await createSchoolStructureService(prisma).listSubjects(principal, filters.classId));
  } catch (error) {
    next(error);
  }
});
