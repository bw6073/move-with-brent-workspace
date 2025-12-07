// app/open-homes/[eventId]/kiosk/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KioskCheckIn } from "./KioskCheckIn";

type RouteParams = {
  eventId: string;
};

type RouteSearchParams = {
  propertyId?: string;
  propertyAddress?: string;
};

type PageProps = {
  params: Promise<RouteParams>;
  searchParams?: Promise<RouteSearchParams>;
};

type OpenHomeEventRow = {
  id: string;
  property_id: number;
};

type PropertyRow = {
  street_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
};

export default async function OpenHomeKioskPage(props: PageProps) {
  // Unwrap Next 16 async params + searchParams
  const [params, searchParamsResolved] = await Promise.all([
    props.params,
    props.searchParams ?? Promise.resolve<RouteSearchParams>({}),
  ]);

  const { eventId } = params;
  const searchParams: RouteSearchParams = searchParamsResolved ?? {};

  const supabase = await createClient();

  // 1) Make sure the event exists
  const { data: event, error: eventError } = await supabase
    .from("open_home_events")
    .select("id, property_id")
    .eq("id", eventId)
    .maybeSingle<OpenHomeEventRow>();

  if (eventError || !event) {
    console.error("Kiosk: failed to load open_home_event", eventError);
    notFound();
  }

  // 2) Try to resolve a human-friendly property address
  let resolvedPropertyAddress = `Property #${event.property_id}`;

  const { data: property } = await supabase
    .from("properties")
    .select("street_address, suburb, state, postcode")
    .eq("id", event.property_id)
    .maybeSingle<PropertyRow>();

  if (property) {
    const labelParts = [
      property.street_address,
      property.suburb,
      property.state || "WA",
      property.postcode,
    ].filter(Boolean) as string[];

    if (labelParts.length > 0) {
      resolvedPropertyAddress = labelParts.join(" ");
    }
  }

  // 3) Allow explicit override via querystring if you want
  const propertyAddress =
    searchParams.propertyAddress &&
    searchParams.propertyAddress.trim().length > 0
      ? searchParams.propertyAddress
      : resolvedPropertyAddress;

  return (
    <KioskCheckIn
      eventId={event.id}
      propertyId={event.property_id}
      propertyAddress={propertyAddress}
    />
  );
}
