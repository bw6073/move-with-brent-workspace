export type Contact = {
  id: number;
  user_id: string;

  firstName: string;
  lastName: string;
  email: string | null;
  phoneMobile: string | null;
  phoneHome: string | null;
  phoneWork: string | null;

  // NEW REAL-ESTATE CRM FIELDS
  stage:
    | "new_lead"
    | "qualified"
    | "nurture"
    | "active_opportunity"
    | "under_contract"
    | "past_client"
    | "lost";
  rating: "hot" | "warm" | "cold";
  timeframe_to_move: "" | "asap" | "0-3" | "3-6" | "6plus" | "just_curious";

  is_seller: boolean;
  is_buyer: boolean;
  marketing_opt_in: boolean;
  do_not_contact: boolean;

  // any other fields you already have…
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};
