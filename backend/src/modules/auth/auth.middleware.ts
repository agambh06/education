import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../db.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const token = request.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("education_session="))
    ?.slice("education_session=".length);
  if (!token) return response.status(401).json({ message: "Authentication required" });

  const session = await prisma.session.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return response.status(401).json({ message: "Authentication required" });
  }

  request.userId = session.userId;
  return next();
}
