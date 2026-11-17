import type { PrismaClient } from "@prisma/client";
import { type ErrorRequestHandler, type Request, Router } from "express";
import { z } from "zod";
import { createParentLinksService, ParentLinkError } from "./parent-links.service.js";

export interface ParentLinksOptions {
  prisma: PrismaClient;
  // Supplied by trusted authentication middleware (#8), never by request fields.
  resolveUserId: (request: Request) => Promise<string | null>;
}

const tokenSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();
const approvalSchema = z.object({ consent: z.literal(true) }).strict();
const linkIdSchema = z.object({ id: z.string().trim().min(1).max(128) });

export function createParentLinksRouter(options?: ParentLinksOptions) {
  const router = Router();
  const service = options && createParentLinksService(options.prisma);
  // Private responses (including invitation secrets) must never enter a shared cache.
  router.use(async (request, response, next) => {
    response.set("Cache-Control", "no-store");
    const userId = options && (await options.resolveUserId(request));
    if (!userId) return response.status(401).json({ message: "Authentication required" });
    response.locals.parentLinkUserId = userId;
    next();
  });

  router.get("/", async (_request, response) => {
    return response.json(await service?.list(response.locals.parentLinkUserId));
  });
  router.post("/invitations", async (request, response) => {
    if (
      !z
        .object({})
        .strict()
        .safeParse(request.body ?? {}).success
    ) {
      return response.status(400).json({ message: "Invitation accepts no identity or consent fields" });
    }
    return response.status(201).json(await service?.createInvitation(response.locals.parentLinkUserId));
  });
  router.post("/requests", async (request, response) => {
    const parsed = tokenSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: "A valid invitation token is required" });
    return response.status(201).json(await service?.requestLink(response.locals.parentLinkUserId, parsed.data.token));
  });
  router.post("/:id/approve", async (request, response) => {
    const id = linkIdSchema.safeParse(request.params);
    const body = approvalSchema.safeParse(request.body);
    if (!id.success || !body.success) return response.status(400).json({ message: "Explicit consent is required" });
    return response.json(await service?.approve(response.locals.parentLinkUserId, id.data.id, body.data.consent));
  });
  router.delete("/:id", async (request, response) => {
    const id = linkIdSchema.safeParse(request.params);
    if (!id.success) return response.status(400).json({ message: "Invalid link ID" });
    return response.json(await service?.revoke(response.locals.parentLinkUserId, id.data.id));
  });
  const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    if (error instanceof ParentLinkError) return response.status(error.status).json({ message: error.message });
    next(error);
  };
  router.use(handleError);
  return router;
}
