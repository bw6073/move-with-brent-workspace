import { z } from "zod";

const optStr = z.string().trim().optional().nullable();
const optNum = z.number().optional().nullable();

export const PropertyCreateSchema = z.object({
  streetAddress: z.string().trim().min(1, "Street address is required"),
  suburb: z.string().trim().min(1, "Suburb is required"),
  state: optStr,
  postcode: optStr,
  lotNumber: optStr,
  propertyType: optStr,
  bedrooms: optNum,
  bathrooms: optNum,
  carSpaces: optNum,
  builtYear: optNum,
  landSize: optNum,
  landSizeUnit: optStr,
  zoning: optStr,
  marketStatus: optStr,
  priceFrom: optNum,
  priceTo: optNum,
  listPrice: optNum,
  soldPrice: optNum,
  campaignStart: optStr,
  campaignEnd: optStr,
  settlementDate: optStr,
  headline: optStr,
  description: optStr,
  notes: optStr,
});

export const PropertyUpdateSchema = PropertyCreateSchema.partial();

export type PropertyCreate = z.infer<typeof PropertyCreateSchema>;
export type PropertyUpdate = z.infer<typeof PropertyUpdateSchema>;
