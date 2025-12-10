// src/app/(app)/layout.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔒 If not logged in, send to dedicated login page
  if (!user) {
    redirect("/login");
  }

  // Logged-in views get the full shell (header + sidebar + footer)
  return <AppShell>{children}</AppShell>;
}
