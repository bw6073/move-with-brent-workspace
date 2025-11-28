import React from "react";
import { requireUser } from "@/lib/auth/requireUser";
import { NewContactClient } from "./NewContactClient";

type PageProps = {
  searchParams?: {
    propertyId?: string;
  };
};

export default async function NewContactPage({ searchParams }: PageProps) {
  // Protect route, same as your other pages
  await requireUser();

  const propertyIdParam = searchParams?.propertyId ?? null;
  const propertyId = propertyIdParam ? Number(propertyIdParam) : null;

  return <NewContactClient propertyId={propertyId} />;
}
