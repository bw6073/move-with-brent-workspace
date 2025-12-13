export const DEAL_STAGES = [
  "lead",
  "nurture",
  "appraisal",
  "pre_market",
  "for_sale",
  "under_offer",
  "sold",
  "lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  lead: "Lead",
  nurture: "Nurture",
  appraisal: "Appraisal",
  pre_market: "Pre-market",
  for_sale: "For sale",
  under_offer: "Under offer",
  sold: "Sold",
  lost: "Lost",
};
