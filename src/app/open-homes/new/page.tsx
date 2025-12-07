// app/open-homes/new/page.tsx
import { createClient } from "@/lib/supabase/server";
import { NewOpenHomeForm } from "./NewOpenHomeForm";

type Property = {
  id: number;
  street_address: string;
  suburb: string;
  state: string;
  postcode: string;
};

export default async function NewOpenHomePage(props: {
  searchParams?: Promise<{ propertyId?: string }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const initialPropertyId = searchParams.propertyId
    ? Number(searchParams.propertyId)
    : undefined;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("properties")
    .select("id, street_address, suburb, state, postcode")
    .order("street_address", { ascending: true })
    .returns<Property[]>();

  if (error) {
    console.error("Error loading properties for open homes", error);
  }

  // ✅ normalise to a plain array so TS is happy
  const properties: Property[] = data ?? [];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Schedule open home</h1>
      <NewOpenHomeForm
        properties={properties}
        initialPropertyId={initialPropertyId}
      />
    </div>
  );
}
