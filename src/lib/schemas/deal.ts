import { z } from "zod";

const optStr = z.string().trim().optional().nullable();
const optNum = z.number().optional().nullable();

export const DealCreateSchema = z.object({
  title: optStr,
  stage: optStr,
  property_id: optNum,
  propertyId: optNum,
  prefillPropertyId: optNum,
  contact_id: optNum,
  contactId: optNum,
  appraisal_id: optNum,
  appraisalId: optNum,
  estimated_value_low: optNum,
  estimated_value_high: optNum,
  confidence: optNum,
  next_action_at: optStr,
  lost_reason: optStr,
  notes: optStr,
});

export const DealUpdateSchema = DealCreateSchema.partial();

export type DealCreate = z.infer<typeof DealCreateSchema>;
export type DealUpdate = z.infer<typeof DealUpdateSchema>;
