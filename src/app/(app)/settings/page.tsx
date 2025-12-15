// src/app/(app)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Update your account details.</p>
      </header>

      <SettingsClient initial={initial} />
    </div>
  );
}
