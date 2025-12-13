import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: attachment, error: loadErr } = await supabase
    .from("attachments")
    .select("id, user_id, bucket, storage_path")
    .eq("id", id)
    .single();

  if (loadErr || !attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attachment.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: storageErr } = await supabase.storage
    .from(attachment.bucket)
    .remove([attachment.storage_path]);

  if (storageErr) {
    console.error(storageErr);
    return NextResponse.json(
      { error: "Failed to delete storage file" },
      { status: 500 }
    );
  }

  const { error: deleteErr } = await supabase
    .from("attachments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteErr) {
    console.error(deleteErr);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
