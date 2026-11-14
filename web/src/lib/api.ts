import type { AnalyzeRequest, AnalyzeResponse } from './types';

const BASE = (import.meta.env?.VITE_API_URL as string | undefined) ?? '';

export class ApiError extends Error {}

/** POST /api/analyze. Sends timing only: kind, downMs, upMs. */
export async function analyze(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the Predict 360 backend. Start it with npm start, then try again.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // fall through to the generic message
  }
  if (!res.ok) {
    const err = (json as { error?: { message?: string; details?: { message: string }[] } } | null)?.error;
    const detail = err?.details?.[0]?.message;
    throw new ApiError(
      res.status >= 500 || !err
        ? "The backend couldn't analyze this check-in. Check that it's running, then try again."
        : [err.message, detail].filter(Boolean).join(' ')
    );
  }
  return json as AnalyzeResponse;
}
