import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url().optional(),
    CORS_ORIGIN: z
      .string()
      .url()
      .transform((origin) => origin.replace(/\/+$/, ""))
      .optional(),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV === "production" && !values.CORS_ORIGIN) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGIN"],
        message: "CORS_ORIGIN must be set in production.",
      });
    }
  })
  .transform((values) => ({
    ...values,
    CORS_ORIGIN: values.CORS_ORIGIN ?? "http://localhost:5173",
  }));

export const env = envSchema.parse(process.env);
