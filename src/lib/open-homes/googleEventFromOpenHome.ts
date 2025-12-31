// src/lib/open-homes/googleEventFromOpenHome.ts
import "server-only";

type OpenHomeRow = {
  id: number;
  property_id: number;
  title: string | null;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  property?: {
    street_address: string;
    suburb: string;
    state: string;
    postcode: string;
  } | null;
};

export function googleEventFromOpenHome(openHome: OpenHomeRow) {
  if (!openHome.start_at) {
    throw new Error("Open home is missing start_at.");
  }

  const start = new Date(openHome.start_at);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Open home start_at is not a valid date.");
  }

  const end = openHome.end_at ? new Date(openHome.end_at) : null;
  const endFinal =
    end && !Number.isNaN(end.getTime())
      ? end
      : new Date(start.getTime() + 60 * 60 * 1000);

  const address = openHome.property
    ? `${openHome.property.street_address}, ${openHome.property.suburb} ${openHome.property.state} ${openHome.property.postcode}`
    : undefined;

  const summary =
    (openHome.title && openHome.title.trim()) ||
    (address ? `Home Open – ${address}` : "Home Open");

  const description = [
    address ? `Address: ${address}` : null,
    `Property ID: ${openHome.property_id}`,
    openHome.notes ? `Notes: ${openHome.notes}` : null,
    `CRM Open Home ID: ${openHome.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary,
    description,
    location: address,
    start: { dateTime: start.toISOString(), timeZone: "Australia/Perth" },
    end: { dateTime: endFinal.toISOString(), timeZone: "Australia/Perth" },
  };
}
