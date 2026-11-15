
import type { AnalyzeRequest } from './types';

const loaders = import.meta.glob<{ default: AnalyzeRequest }>('../../../fixtures/json/*.request.json');

export const DEMO_SESSIONS = [
  { name: 'ordinary', label: 'Ordinary typing', note: 'No scripted change.' },
  { name: 'longer_key_holds', label: 'Longer key holds', note: 'Every key held 1.8x longer.' },
  { name: 'four_second_pause', label: 'Four-second pause', note: 'A deliberate 4 s pause between sentences.' },
  { name: 'uneven_typing', label: 'Uneven rhythm', note: 'Irregular gaps between keys.' },
  { name: 'distracted_pause', label: 'Distracted typist', note: 'A 6.5 s distraction between sentences.' },
  { name: 'held_out_missed_change', label: 'Missed timing change', note: 'The simulated key holds got longer, but the model missed the change.' },
] as const;

export type DemoName = (typeof DEMO_SESSIONS)[number]['name'];

export async function loadDemoRequest(name: DemoName): Promise<AnalyzeRequest> {
  const entry = Object.entries(loaders).find(([path]) => path.endsWith(`/${name}.request.json`));
  if (!entry) throw new Error(`Unknown demo session: ${name}`);
  return (await entry[1]()).default;
}
