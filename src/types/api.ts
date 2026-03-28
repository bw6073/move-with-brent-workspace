// src/types/api.ts
// Canonical snake_case DB row types matching actual table columns

export type ContactRow = {
  id: number;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  stage: string | null;
  rating: string | null;
  is_buyer: boolean | null;
  is_seller: boolean | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyRow = {
  id: number;
  user_id: string;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string | null;
  lot_number: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;
  built_year: number | null;
  land_size: number | null;
  land_size_unit: string | null;
  zoning: string | null;
  market_status: string | null;
  price_from: number | null;
  price_to: number | null;
  list_price: number | null;
  sold_price: number | null;
  campaign_start: string | null;
  campaign_end: string | null;
  settlement_date: string | null;
  headline: string | null;
  description: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DealRow = {
  id: number;
  user_id: string;
  title: string;
  stage: string | null;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  property_id: number | null;
  contact_id: number | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskRow = {
  id: number;
  user_id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  notes: string | null;
  related_property_id: number | null;
  related_contact_id: number | null;
  deleted_at: string | null;
  created_at: string;
};

export type AppraisalRow = {
  id: number;
  user_id: string;
  status: string | null;
  property_id: number | null;
  google_event_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type OpenHomeEventRow = {
  id: number;
  user_id: string;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendeeRow = {
  id: number;
  open_home_event_id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  contact_id: number | null;
  created_at: string;
};

export type ListResponse<T> = {
  items: T[];
  total?: number;
};
