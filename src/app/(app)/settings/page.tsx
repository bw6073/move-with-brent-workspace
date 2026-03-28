// src/app/(app)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

type GoogleAccountRow = {
  user_id: string;
  open_homes_calendar_id: string | null;
  appraisals_calendar_id: string | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const initial = {
    email: user.email ?? "",
    displayName: (user.user_metadata?.display_name as string | undefined) ?? "",
    phone: (user.user_metadata?.phone as string | undefined) ?? "",
  };

  const [{ data: gacc }, { data: emailSettings }] = await Promise.all([
    supabase
      .from("google_accounts")
      .select("user_id, open_homes_calendar_id, appraisals_calendar_id")
      .eq("user_id", user.id)
      .maybeSingle<GoogleAccountRow>(),
    supabase
      .from("user_settings")
      .select("resend_api_key, resend_from_email, resend_from_name")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const googleConnected = Boolean(gacc?.user_id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Update your account details.</p>
      </header>

      <SettingsClient
        initial={initial}
        googleConnected={googleConnected}
        initialOpenHomesCalendarId={gacc?.open_homes_calendar_id ?? null}
        initialAppraisalsCalendarId={gacc?.appraisals_calendar_id ?? null}
        initialEmailSettings={{
          resendApiKeySet: Boolean(emailSettings?.resend_api_key),
          resendFromEmail: emailSettings?.resend_from_email ?? "",
          resendFromName: emailSettings?.resend_from_name ?? "",
        }}
      />
    </div>
  );
}
