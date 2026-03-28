import { z } from "zod";

const optStr = z.string().trim().optional().nullable();

export const OpenHomeCreateSchema = z.object({
  propertyId: z.union([z.string(), z.number()]).refine(
    (v) => Number.isFinite(Number(v)),
    "propertyId must be a valid number"
  ),
  startAt: z.string().min(1, "startAt is required"),
  endAt: optStr,
  title: optStr,
  notes: optStr,
});

export const OpenHomeUpdateSchema = z.object({
  title: optStr,
  startAt: z.string().optional().nullable(),
  endAt: optStr,
  notes: optStr,
});

export type OpenHomeCreate = z.infer<typeof OpenHomeCreateSchema>;
export type OpenHomeUpdate = z.infer<typeof OpenHomeUpdateSchema>;
