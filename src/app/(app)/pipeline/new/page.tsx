// src/app/(app)/pipeline/new/page.tsx
import React from "react";
import DealNewClient from "./DealNewClient";
import { notFound } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewDealPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const raw = sp.propertyId;

  const propertyId =
    typeof raw === "string"
      ? Number(raw)
      : Array.isArray(raw)
      ? Number(raw[0])
      : null;

  if (raw && !Number.isFinite(propertyId)) notFound();

  return (
    <DealNewClient
      prefillPropertyId={
        Number.isFinite(propertyId) ? (propertyId as number) : null
      }
    />
  );
}
