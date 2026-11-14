export interface PlanDay { date: string; buckets: { activeMs: number; trackedMs: number }[] }
export type Energy = 'low' | 'steady' | 'good' | null;
export function createWorkdayPlan(input?: { days?: PlanDay[]; energy?: Energy }): {
  observedDays: number; usualActiveMinutes: number | null; aboveRecentUsage: boolean;
  suggestions: { id: string; title: string; detail: string }[]; private: true; employmentDecision: false;
};
