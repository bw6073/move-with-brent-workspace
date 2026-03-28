// src/app/properties/[id]/edit/page.tsx
import React from "react";
import { requireUser } from "@/lib/auth/requireUser";
import { PropertyForm } from "@/components/properties/PropertyForm";

// In Next 16 for this route, `params` itself is a Promise
type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPropertyPage({ params }: PageProps) {
  // ✅ Unwrap the params Promise
  const { id } = await params;

  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-600">
        Invalid property ID in URL.
      </div>
    );
  }

  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", numericId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to load property for edit", error, "id:", numericId);
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-600">
        Property not found or does not belong to your account.
        <br />
        (ID: {numericId})
      </div>
    );
  }

  const initialValues = {
    streetAddress: data.street_address ?? "",
    suburb: data.suburb ?? "",
    state: data.state ?? "WA",
    postcode: data.postcode ?? "",
    propertyType: data.property_type ?? "",
    bedrooms: data.bedrooms?.toString() ?? "",
    bathrooms: data.bathrooms?.toString() ?? "",
    carSpaces: data.car_spaces?.toString() ?? "",
    landSize: data.land_size?.toString() ?? "",
    landSizeUnit: data.land_size_unit ?? "",
    zoning: data.zoning ?? "",
    marketStatus: data.market_status ?? "appraisal",
    headline: data.headline ?? "",
    description: data.description ?? "",
    notes: data.notes ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <PropertyForm
        mode="edit"
        propertyId={numericId}
        initialValues={initialValues}
      />
    </div>
  );
}
