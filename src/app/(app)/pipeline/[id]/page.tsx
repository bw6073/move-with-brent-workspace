import React from "react";
import { notFound } from "next/navigation";
import DealDetailClient from "./DealDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const dealId = Number(id);

  if (!Number.isFinite(dealId)) notFound();

  return <DealDetailClient dealId={dealId} />;
}
