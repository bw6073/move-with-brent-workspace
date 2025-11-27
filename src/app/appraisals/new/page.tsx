// src/app/appraisals/new/page.tsx
import AppraisalForm from "@/components/appraisal/AppraisalForm";
import { createClient } from "@/lib/supabase/server";

type PageSearchParams = {
  contactId?: string;
  propertyId?: string;
};

type PageProps = {
  searchParams: Promise<PageSearchParams>;
};

export default async function NewAppraisalPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  // Next 16: searchParams is a Promise
  const sp = await searchParams;
  const contactIdParam = sp?.contactId;
  const propertyIdParam = sp?.propertyId;

  let prefillContact: any | null = null;
  let propertyId: number | null = null;

  // ─────────────────────────────
  // 1) Parse propertyId (if any)
  // ─────────────────────────────
  if (propertyIdParam) {
    const numeric = Number(propertyIdParam);
    if (!Number.isNaN(numeric)) {
      propertyId = numeric;
    } else {
      console.warn(
        "[new appraisal] Invalid propertyId query param",
        propertyIdParam
      );
    }
  }

  // ─────────────────────────────
  // 2) Optional contact prefill
  // ─────────────────────────────
  if (contactIdParam) {
    const contactId = Number(contactIdParam);

    if (!Number.isNaN(contactId)) {
      // Get authed user for RLS
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && user) {
        const { data, error } = await supabase
          .from("contacts")
          .select(
            `
            id,
            preferred_name,
            name,
            first_name,
            last_name,
            email,
            phone_mobile,
            phone_home,
            phone_work,
            phone
          `
          )
          .eq("id", contactId)
          .eq("user_id", user.id)
          .single();

        if (!error && data) {
          const fullName =
            data.preferred_name ||
            data.name ||
            [data.first_name, data.last_name].filter(Boolean).join(" ");

          const phone =
            data.phone_mobile ||
            data.phone_home ||
            data.phone_work ||
            data.phone ||
            null;

          prefillContact = {
            id: data.id,
            full_name: fullName || null,
            first_name: data.first_name ?? null,
            last_name: data.last_name ?? null,
            email: data.email ?? null,
            phone,
          };

          console.log("[new appraisal] prefillContact", prefillContact);
        } else {
          console.error(
            "[new appraisal] Failed to load contact for prefill",
            error
          );
        }
      } else {
        console.error("[new appraisal] No authenticated user", userError);
      }
    } else {
      console.warn(
        "[new appraisal] Invalid contactId query param",
        contactIdParam
      );
    }
  }

  return (
    <AppraisalForm
      mode="create"
      appraisalId={undefined}
      initialForm={null}
      prefillContact={prefillContact}
      propertyId={propertyId} // 👈 key line for property linkage
    />
  );
}
