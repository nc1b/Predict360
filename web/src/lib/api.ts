import type { AnalyzeRequest, AnalyzeResponse } from './types';
import type { WeatherContext } from '@/components/weather-context';

const BASE = (import.meta.env?.VITE_API_URL as string | undefined) ?? '';

export class ApiError extends Error {}

export class AiUnconfiguredError extends ApiError {}

export async function analyze(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError("Can't reach the Predict 360 backend. Start it with npm start, then try again.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
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

export async function explain(result: AnalyzeResponse, weather: WeatherContext | null | undefined, token: string): Promise<string> {
  const summary = {
    readinessScore: result.readinessScore,
    status: result.status,
    features: {
      dwellMs: { value: result.features.dwellMs.value },
      sentencePauseMs: { value: result.features.sentencePauseMs.value },
      flightVolatilityMs: { value: result.features.flightVolatilityMs.value },
    },
    comparisons: result.comparisons,
    drivers: result.drivers,
  };
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ summary, ...(weather ? { weather: { meanHpa: weather.meanHpa, minHpa: weather.minHpa, maxHpa: weather.maxHpa, changeHpa: weather.changeHpa } } : {}) }),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new ApiError("Can't reach the backend for an explanation.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
  }
  if (!res.ok) {
    const code = (json as { error?: { code?: string; message?: string } } | null)?.error?.code;
    const message = (json as { error?: { message?: string } } | null)?.error?.message;
    if (code === 'ai_unconfigured') {
      throw new AiUnconfiguredError(message ?? 'AI explanations are not configured.');
    }
    throw new ApiError(message ?? "Couldn't get an explanation right now.");
  }
  const text = (json as { text?: string } | null)?.text;
  if (typeof text !== 'string') throw new ApiError("Couldn't get an explanation right now.");
  return text;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryItem {
  date: string;
  readinessScore: number | null;
  features: {
    dwellMs: { value: number | null };
    sentencePauseMs: { value: number | null };
    flightVolatilityMs: { value: number | null };
  };
}

export async function chat(messages: ChatMessage[], history: ChatHistoryItem[], token: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages, history }),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new ApiError("Can't reach the assistant.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
  }
  if (!res.ok) {
    const code = (json as { error?: { code?: string; message?: string } } | null)?.error?.code;
    const message = (json as { error?: { message?: string } } | null)?.error?.message;
    if (code === 'ai_unconfigured') throw new AiUnconfiguredError(message ?? 'AI chat is not configured.');
    throw new ApiError(message ?? "The assistant couldn't reply right now.");
  }
  const text = (json as { text?: string } | null)?.text;
  if (typeof text !== 'string') throw new ApiError("The assistant couldn't reply right now.");
  return text;
}

export interface DailyAnalysisInput {
  today: AnalyzeResponse | null;
  history: ChatHistoryItem[];
  energy: 'low' | 'steady' | 'good' | null;
  activity?: { activeMinutesToday: number; usualActiveMinutes: number | null; keyPressesToday: number } | null;
}

/** Claude Opus compares today with the user's own history. Numbers only; words never leave the browser. */
export async function dailyAnalysis(input: DailyAnalysisInput, token: string): Promise<string> {
  const today = input.today && {
    readinessScore: input.today.readinessScore,
    status: input.today.status,
    features: {
      dwellMs: { value: input.today.features.dwellMs.value },
      sentencePauseMs: { value: input.today.features.sentencePauseMs.value },
      flightVolatilityMs: { value: input.today.features.flightVolatilityMs.value },
    },
    comparisons: input.today.comparisons,
    drivers: input.today.drivers,
  };
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/daily-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ today, history: input.history, energy: input.energy, activity: input.activity ?? undefined }),
      signal: AbortSignal.timeout(100000),
    });
  } catch {
    throw new ApiError("Can't reach the backend for your daily analysis.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
  }
  if (!res.ok) {
    const code = (json as { error?: { code?: string } } | null)?.error?.code;
    const message = (json as { error?: { message?: string } } | null)?.error?.message;
    if (code === 'ai_unconfigured') throw new AiUnconfiguredError(message ?? 'AI analysis is not configured.');
    throw new ApiError(message ?? "Couldn't write your analysis right now.");
  }
  const text = (json as { text?: string } | null)?.text;
  if (typeof text !== 'string') throw new ApiError("Couldn't write your analysis right now.");
  return text;
}
