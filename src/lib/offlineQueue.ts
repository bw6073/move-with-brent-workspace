// src/lib/offlineQueue.ts

const KEY = "mwb-kiosk-offline-queue";

export type QueuedAttendee = {
  id: string; // client-side ID
  eventId: string;
  payload: any;
  createdAt: string;
};

function readQueue(): QueuedAttendee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedAttendee[];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedAttendee[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(queue));
}

export function addToQueue(eventId: string, payload: any) {
  const queue = readQueue();
  queue.push({
    id: crypto.randomUUID(),
    eventId,
    payload,
    createdAt: new Date().toISOString(),
  });
  writeQueue(queue);
}

export function getQueue() {
  return readQueue();
}

export function clearItem(id: string) {
  const queue = readQueue().filter((item) => item.id !== id);
  writeQueue(queue);
}
