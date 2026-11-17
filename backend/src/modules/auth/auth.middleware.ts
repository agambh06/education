import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../db.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

function sessionToken(request: Request) {
  return request.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("education_session="))
    ?.slice("education_session=".length);
}

export async function resolveAuthenticatedUser(request: Request) {
  const token = sessionToken(request);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    include: { user: { select: { role: true } } },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return { userId: session.userId, role: session.user.role };
}

export async function resolveAuthenticatedUserId(request: Request) {
  return (await resolveAuthenticatedUser(request))?.userId ?? null;
}

export function requireAuth(resolveUser = resolveAuthenticatedUser) {
  return async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const user = await resolveUser(request);
    if (!user) return response.status(401).json({ message: "Authentication required" });
    request.userId = user.userId;
    return next();
  };
}
