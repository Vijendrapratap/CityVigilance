import type { ModelEvent } from "./pipeline/types";

export type AnalyzeResult = {
  event: ModelEvent;
  summary: string;
};

export type ModelHealth = {
  ready: boolean;
  device: string;
  detector: string;
};

export async function modelHealth(): Promise<ModelHealth | null> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return null;
    return (await response.json()) as ModelHealth;
  } catch {
    return null;
  }
}

export async function analyzeClip(moduleId: string, file: File): Promise<AnalyzeResult> {
  const response = await fetch(`/api/analyze?module=${encodeURIComponent(moduleId)}&name=${encodeURIComponent(file.name)}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const payload = (await response.json().catch(() => null)) as { event?: ModelEvent; summary?: string; error?: string } | null;
  if (!response.ok || !payload?.event || !payload.summary) {
    throw new Error(payload?.error || "The model service did not read this clip.");
  }
  return { event: payload.event, summary: payload.summary };
}
