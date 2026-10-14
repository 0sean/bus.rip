import { z } from "zod";

export const operatorCode = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .transform((value) => value.toUpperCase());
export const resourceId = z.string().trim().min(1).max(200);
