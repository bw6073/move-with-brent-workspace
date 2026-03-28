// src/app/api/contacts/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/requireUser";

// Simple CSV parser — handles quoted fields with commas and newlines
function parseCsv(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "\n" && !inQuote) {
      lines.push(current);
      current = "";
    } else if (ch === "\r" && !inQuote) {
      // skip carriage return
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  if (lines.length < 2) return [];

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let field = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { field += '"'; i++; }
        else q = !q;
      } else if (ch === "," && !q) {
        fields.push(field.trim());
        field = "";
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = splitLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });
}

// Map flexible column names to canonical DB columns
function mapRow(row: Record<string, string>): Record<string, unknown> | null {
  const get = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = row[k]?.trim();
      if (v) return v;
    }
    return null;
  };

  const firstName = get("first_name", "firstname", "first");
  const lastName = get("last_name", "lastname", "last", "surname");
  const nameParts = [firstName, lastName].filter(Boolean).join(" ");
  const nameRaw = get("name", "full_name", "fullname") ?? nameParts;
  const name = nameRaw || null;

  if (!name) return null; // skip rows with no name at all

  const bool = (v: string | null): boolean | null => {
    if (!v) return null;
    return ["true", "yes", "1", "y"].includes(v.toLowerCase());
  };

  return {
    name,
    first_name: firstName,
    last_name: lastName,
    preferred_name: get("preferred_name", "preferred", "nickname"),
    email: get("email", "email_address"),
    phone_mobile: get("phone_mobile", "mobile", "cell", "phone"),
    phone_home: get("phone_home", "home_phone"),
    phone_work: get("phone_work", "work_phone"),
    street_address: get("street_address", "address", "street"),
    suburb: get("suburb", "city", "town"),
    state: get("state"),
    postcode: get("postcode", "post_code", "zip"),
    postal_address: get("postal_address"),
    contact_type: get("contact_type", "type"),
    lead_source: get("lead_source", "source"),
    stage: get("stage"),
    rating: get("rating"),
    notes: get("notes", "note", "comments"),
    is_buyer: bool(get("is_buyer", "buyer")),
    is_seller: bool(get("is_seller", "seller")),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, errorResponse } = await requireUser();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => null);
    if (!body?.csv || typeof body.csv !== "string") {
      return NextResponse.json({ error: "Missing csv field" }, { status: 400 });
    }

    const rows = parseCsv(body.csv);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows found in CSV" }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: "Max 500 rows per import" }, { status: 400 });
    }

    const mapped = rows
      .map(mapRow)
      .filter((r): r is Record<string, unknown> => r !== null)
      .map((r) => ({ ...r, user_id: user.id }));

    if (mapped.length === 0) {
      return NextResponse.json({ error: "No valid rows found (every row missing a name)" }, { status: 400 });
    }

    const { data, error } = await supabase.from("contacts").insert(mapped).select("id");

    if (error) {
      console.error("[contacts/import] Supabase error", error);
      return NextResponse.json({ error: "Import failed", supabaseError: error }, { status: 500 });
    }

    return NextResponse.json({ imported: data?.length ?? 0, skipped: rows.length - mapped.length });
  } catch (err) {
    console.error("[contacts/import] unexpected error", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
