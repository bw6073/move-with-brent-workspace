// src/lib/offline/appraisalQueue.ts
export type AppraisalJobPayload = {
  // Whatever you POST to /api/appraisals right now.
  // Keep this in sync with your actual API.
  mode: "create";
  data: any;
};

type QueuedAppraisalJob = {
  id: string;
  createdAt: string;
  payload: AppraisalJobPayload;
};

const STORAGE_KEY = "mwbrent-appraisal-queue-v1";

function loadQueue(): QueuedAppraisalJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAppraisalJob[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function enqueueAppraisalJob(payload: AppraisalJobPayload): string {
  const queue = loadQueue();
  const id = `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const job: QueuedAppraisalJob = {
    id,
    createdAt: new Date().toISOString(),
    payload,
  };

  queue.push(job);
  saveQueue(queue);
  return id;
}

export async function processAppraisalQueue(): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (!navigator.onLine) return 0;

  let queue = loadQueue();
  if (!queue.length) return 0;

  const remaining: QueuedAppraisalJob[] = [];

  for (const job of queue) {
    try {
      const res = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job.payload),
      });

      if (!res.ok) {
        // Keep it in the queue if still failing
        remaining.push(job);
      }
    } catch {
      // Network failure – keep job
      remaining.push(job);
      break; // no point hammering if offline again
    }
  }

  saveQueue(remaining);
  return queue.length - remaining.length;
}
