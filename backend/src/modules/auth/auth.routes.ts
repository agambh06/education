import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { type Response, Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../db.js";
import { type AuthenticatedRequest, requireAuth } from "./auth.middleware.js";

const scrypt = promisify(scryptCallback);
const sessionCookie = "education_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;
const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
});

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, encodedHash: string) {
  const [saltHex, hashHex] = encodedHash.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function setSessionCookie(response: import("express").Response, token: string) {
  const sameSite = env.AUTH_COOKIE_SAME_SITE === "none" ? "None" : "Lax";
  const secure = env.NODE_ENV === "production" || sameSite === "None" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${sessionCookie}=${token}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${sessionDurationMs / 1000}${secure}`,
  );
}

function clearSessionCookie(response: import("express").Response) {
  const sameSite = env.AUTH_COOKIE_SAME_SITE === "none" ? "None" : "Lax";
  const secure = env.NODE_ENV === "production" || sameSite === "None" ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${sessionCookie}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`);
}

async function createSession(userId: string, response: import("express").Response) {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      userId,
      expiresAt: new Date(Date.now() + sessionDurationMs),
    },
  });
  setSessionCookie(response, token);
}

export const authRouter = Router();

authRouter.post("/register", async (request, response) => {
  const parsed = credentialsSchema
    .extend({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80) })
    .safeParse(request.body);
  if (!parsed.success)
    return response
      .status(400)
      .json({ message: "Enter a valid email, name, and password with at least 8 characters." });
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } }))
    return response.status(409).json({ message: "An account with this email already exists." });

  try {
    const user = await prisma.user.create({
      data: {
        email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        role: "PARENT",
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    await createSession(user.id, response);
    return response.status(201).json({ user });
  } catch {
    return response.status(409).json({ message: "An account with this email already exists." });
  }
});

authRouter.post("/login", async (request, response) => {
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "Enter a valid email and password." });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return response.status(401).json({ message: "Email or password is incorrect." });
  }
  await createSession(user.id, response);
  return response.json({
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  });
});

authRouter.post("/logout", async (request, response) => {
  const token = request.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
  }
  clearSessionCookie(response);
  return response.status(204).end();
});

authRouter.get("/me", requireAuth(), async (request: AuthenticatedRequest, response: Response) => {
  if (!request.userId) return response.status(401).json({ message: "Authentication required" });
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
  return user ? response.json({ user }) : response.status(401).json({ message: "Authentication required" });
});
