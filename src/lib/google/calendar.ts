// src/lib/google/calendar.ts
import "server-only";

export type GoogleAccount = {
  user_id: string;
  calendar_id: string | null;
  open_homes_calendar_id?: string | null; // optional dedicated calendar
  access_token: string;
  refresh_token: string | null;
  expiry: string; // timestamptz ISO
};

export type GoogleEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
};

type GoogleFetchResult = {
  res: Response;
  json: any | null;
  text: string;
};

function safeJsonParse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function googleFetch(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<GoogleFetchResult> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  const json = safeJsonParse(text);

  return { res, json, text };
}

function googleErrorMessage(f: GoogleFetchResult, fallback: string) {
  return (
    f.json?.error?.message ||
    f.json?.error_description ||
    (typeof f.text === "string" && f.text.trim() ? f.text.trim() : null) ||
    fallback
  );
}

export async function refreshGoogleToken(
  account: GoogleAccount,
  updateTokens: (
    patch: Pick<GoogleAccount, "access_token" | "expiry">
  ) => Promise<void>
) {
  const expiresAt = new Date(account.expiry).getTime();
  const now = Date.now();

  // refresh only if within ~2 minutes of expiry
  if (expiresAt - now > 2 * 60 * 1000) return account.access_token;

  if (!account.refresh_token) {
    throw new Error("Google refresh token missing (reconnect required).");
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: account.refresh_token,
    grant_type: "refresh_token",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = await resp.json().catch(() => ({} as any));

  if (!resp.ok) {
    throw new Error(
      data?.error_description || data?.error || "Failed to refresh Google token"
    );
  }

  const newAccess = String(data.access_token || "");
  const expiresIn = Number(data.expires_in ?? 3600);
  const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

  if (!newAccess) {
    throw new Error("Google token refresh returned no access_token.");
  }

  await updateTokens({ access_token: newAccess, expiry: newExpiry });

  return newAccess;
}

export async function createGoogleCalendarEvent(args: {
  accessToken: string;
  calendarId: string;
  event: GoogleEventInput;
}) {
  const f = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      args.calendarId
    )}/events`,
    args.accessToken,
    { method: "POST", body: JSON.stringify(args.event) }
  );

  if (!f.res.ok) {
    throw new Error(googleErrorMessage(f, "Failed to create calendar event"));
  }

  return f.json as { id: string; htmlLink?: string };
}

export async function updateGoogleCalendarEvent(args: {
  accessToken: string;
  calendarId: string;
  eventId: string;
  event: GoogleEventInput;
}) {
  const f = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      args.calendarId
    )}/events/${encodeURIComponent(args.eventId)}`,
    args.accessToken,
    { method: "PUT", body: JSON.stringify(args.event) }
  );

  if (!f.res.ok) {
    throw new Error(googleErrorMessage(f, "Failed to update calendar event"));
  }

  return f.json as { id: string; htmlLink?: string };
}

export async function deleteGoogleCalendarEvent(args: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}) {
  const f = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      args.calendarId
    )}/events/${encodeURIComponent(args.eventId)}`,
    args.accessToken,
    { method: "DELETE" }
  );

  // 410 = already gone
  if (!f.res.ok && f.res.status !== 410) {
    throw new Error(googleErrorMessage(f, "Failed to delete calendar event"));
  }

  return true;
}
