import { z } from "zod";

const optStr = z.string().trim().optional().nullable();
const optBool = z.boolean().optional().nullable();

export const ContactCreateSchema = z.object({
  first_name: optStr,
  last_name: optStr,
  name: optStr,
  email: z.string().trim().email("Invalid email").optional().nullable(),
  phone: optStr,
  phone_mobile: optStr,
  phone_home: optStr,
  phone_work: optStr,
  type: optStr,
  tags: z.array(z.string()).optional().nullable(),
  source: optStr,
  notes: optStr,
  stage: optStr,
  rating: optStr,
  timeframe_to_move: optStr,
  is_buyer: optBool,
  is_seller: optBool,
  marketing_opt_in: optBool,
  do_not_contact: optBool,
  street_address: optStr,
  suburb: optStr,
  state: optStr,
  postcode: optStr,
  postal_address: optStr,
  contact_type: optStr,
  lead_source: optStr,
});

export const ContactUpdateSchema = ContactCreateSchema.partial();

export type ContactCreate = z.infer<typeof ContactCreateSchema>;
export type ContactUpdate = z.infer<typeof ContactUpdateSchema>;
