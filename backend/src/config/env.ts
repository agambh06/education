import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().url().default(
    process.env.NODE_ENV === "production"
      ? "https://education-8mju.vercel.app"
      : "http://localhost:5173",
  ),
});

export const env = envSchema.parse(process.env);
