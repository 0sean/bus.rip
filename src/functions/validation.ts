import { z } from "zod";

export const operatorCode = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .transform((value) => value.toUpperCase());
export const resourceId = z.string().trim().min(1).max(200);

export const boundingBox = z
  .tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ])
  .refine(([west, south, east, north]) => west < east && south < north, {
    message: "Invalid bounding box",
  });

export const locationFilter = z.union([
  operatorCode,
  z.object({ boundingBox }),
]);
