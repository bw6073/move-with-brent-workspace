import "./globals.css";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { MainLayout } from "@/components/layout/MainLayout";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email ?? null;

  return (
    <html lang="en">
      <body className="bg-slate-50">
        <MainLayout userEmail={userEmail}>{children}</MainLayout>
      </body>
    </html>
  );
}
