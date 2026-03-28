// src/app/(app)/pipeline/[id]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import DealDetailClient from "./DealDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

const DEAL_SELECT = `
  id,
  title,
  stage,
  estimated_value_low,
  estimated_value_high,
  confidence,
  next_action_at,
  notes,
  contact_id,
  property_id,
  appraisal_id,
  created_at,
  updated_at,
  contacts:contact_id (
    id,
    first_name,
    last_name,
    phone_mobile,
    email
  ),
  properties:property_id (
    id,
    street_address,
    suburb,
    state,
    postcode
  ),
  appraisals:appraisal_id (
    id,
    status,
    created_at,
    updated_at,
    data
  )
`;

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) notFound();

  const { user, supabase } = await requireUser();

  const { data: deal, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("id", dealId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !deal) {
    console.error("[deal detail] load error", error);
    notFound();
  }

  // Load tasks linked to this deal's property (preferred) or contact as fallback
  let taskRows: any[] = [];
  if (deal.property_id) {
    const { data } = await supabase
      .from("tasks")
      .select("id,title,status,priority,task_type,due_date,related_contact_id,related_property_id")
      .eq("user_id", user.id)
      .eq("related_property_id", deal.property_id)
      .is("deleted_at", null)
      .order("due_date", { ascending: true })
      .limit(100);
    taskRows = data ?? [];
  } else if (deal.contact_id) {
    const { data } = await supabase
      .from("tasks")
      .select("id,title,status,priority,task_type,due_date,related_contact_id,related_property_id")
      .eq("user_id", user.id)
      .eq("related_contact_id", deal.contact_id)
      .is("deleted_at", null)
      .order("due_date", { ascending: true })
      .limit(100);
    taskRows = data ?? [];
  }

  return <DealDetailClient initialDeal={deal as any} initialTasks={taskRows} />;
}
