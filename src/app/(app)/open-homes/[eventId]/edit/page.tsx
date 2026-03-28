// src/app/(app)/open-homes/[eventId]/edit/page.tsx
import { requireUser } from "@/lib/auth/requireUser";
import { EditOpenHomeForm } from "./EditOpenHomeForm";

type OpenHomeEvent = {
  id: string;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  google_event_id: string | null;
};

type Property = {
  id: number;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
};

export default async function EditOpenHomePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { user, supabase } = await requireUser();

  // 1) Load the event
  const { data: event, error: eventError } = await supabase
    .from("open_home_events")
    .select("id, property_id, title, start_at, end_at, notes, google_event_id")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .single<OpenHomeEvent>();

  if (eventError || !event) {
    console.error("Error loading open_home_event", eventError);
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">Edit open home</h1>
        <p className="text-red-600">Could not load this open home.</p>
      </div>
    );
  }

  // 2) Load properties for dropdown
  const { data: propertiesData, error: propertiesError } = await supabase
    .from("properties")
    .select("id, street_address, suburb, state, postcode")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("street_address", { ascending: true })
    .returns<Property[]>();

  if (propertiesError) {
    console.error("Error loading properties", propertiesError);
  }

  // ✅ Always a real array for the form
  const properties: Property[] = propertiesData ?? [];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Edit open home</h1>
      <EditOpenHomeForm event={event} properties={properties} />
    </div>
  );
}
