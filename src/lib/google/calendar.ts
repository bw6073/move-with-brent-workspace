// src/lib/google/calendar.ts
import "server-only";

type GoogleAccount = {
  user_id: string;
  calendar_id: string;
  access_token: string;
  refresh_token: string | null;
  expiry: string; // timestamptz ISO
};

type GoogleEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
};

async function googleFetch(
  url: string,
  accessToken: string,
  init?: RequestInit
) {
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
  const json = text ? JSON.parse(text) : null;

  return { res, json };
}

export async function refreshGoogleToken(
  account: GoogleAccount,
  updateTokens: (patch: Partial<GoogleAccount>) => Promise<void>
) {
  // Refresh only if expiry is within ~2 minutes
  const expiresAt = new Date(account.expiry).getTime();
  const now = Date.now();
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

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(
      data?.error_description || "Failed to refresh Google token"
    );
  }

  const newAccess = data.access_token as string;
  const expiresIn = Number(data.expires_in ?? 3600);
  const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

  await updateTokens({
    access_token: newAccess,
    expiry: newExpiry,
    token_type: data.token_type ?? undefined,
    scope: data.scope ?? undefined,
  } as any);

  return newAccess;
}

export async function createGoogleCalendarEvent(args: {
  accessToken: string;
  calendarId: string;
  event: GoogleEventInput;
}) {
  const { res, json } = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      args.calendarId
    )}/events`,
    args.accessToken,
    {
      method: "POST",
      body: JSON.stringify(args.event),
    }
  );

  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to create calendar event");
  }

  return json as { id: string; htmlLink?: string };
}

export async function updateGoogleCalendarEvent(args: {
  accessToken: string;
  calendarId: string;
  eventId: string;
  event: GoogleEventInput;
}) {
  const { res, json } = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      args.calendarId
    )}/events/${encodeURIComponent(args.eventId)}`,
    args.accessToken,
    {
      method: "PUT",
      body: JSON.stringify(args.event),
    }
  );

  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to update calendar event");
  }

  return json as { id: string; htmlLink?: string };
}

export async function deleteGoogleCalendarEvent(args: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}) {
  const { res, json } = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      args.calendarId
    )}/events/${encodeURIComponent(args.eventId)}`,
    args.accessToken,
    { method: "DELETE" }
  );

  if (!res.ok && res.status !== 410) {
    throw new Error(json?.error?.message || "Failed to delete calendar event");
  }

  return true;
}
