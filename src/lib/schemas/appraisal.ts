import { z } from "zod";

const optStr = z.string().trim().optional().nullable();
const optNum = z.number().optional().nullable();

export const AppraisalCreateSchema = z.object({
  streetAddress: z.string().trim().min(1, "Street address is required"),
  suburb: z.string().trim().min(1, "Suburb is required"),
  postcode: z.string().trim().min(1, "Postcode is required"),
  state: optStr,
  status: optStr,
  appraisalTitle: optStr,
  property_id: optNum,
  propertyId: optNum,
  contactIds: z.array(z.number()).optional(),
  data: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const AppraisalUpdateSchema = z.object({
  status: optStr,
  property_id: optNum,
  propertyId: optNum,
  contactIds: z.array(z.number()).optional(),
  data: z.record(z.string(), z.unknown()).optional().nullable(),
  google_event_id: optStr,
  googleEventId: optStr,
});

export type AppraisalCreate = z.infer<typeof AppraisalCreateSchema>;
export type AppraisalUpdate = z.infer<typeof AppraisalUpdateSchema>;
