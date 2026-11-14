import config from '../../../config/public.json';
const base = `${config.supabaseUrl}/storage/v1/object/public/app-releases/`;
interface Manifest { filename: string; size: number; sha256: string; parts: { path: string; size: number }[] }
export function validManifest(value: unknown): value is Manifest {
  const m = value as Manifest | null;
  return !!m && /^Predict360-[A-Za-z0-9._-]+\.exe$/.test(m.filename) && Number.isSafeInteger(m.size) && m.size > 0 && m.size <= 300 * 1024 * 1024 && /^[a-f0-9]{64}$/.test(m.sha256) &&
    Array.isArray(m.parts) && m.parts.length > 0 && m.parts.length <= 10 && m.parts.every((part) => /^windows\/[A-Za-z0-9._-]+\/part-\d+$/.test(part.path) && Number.isSafeInteger(part.size) && part.size > 0 && part.size <= 40 * 1024 * 1024) && m.parts.reduce((sum, part) => sum + part.size, 0) === m.size;
}
export async function downloadDesktop(progress: (percent: number) => void) {
  const response = await fetch(`${base}windows/latest.json`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('The Windows download is not available yet. Please try again shortly.');
  const manifest: unknown = await response.json();
  if (!validManifest(manifest)) throw new Error('The download information is invalid. Please try again later.');
  const bytes = new Uint8Array(manifest.size);
  let offset = 0;
  for (const part of manifest.parts) {
    const result = await fetch(`${base}${part.path}`, { signal: AbortSignal.timeout(120000) });
    if (!result.ok) throw new Error('Download interrupted. Please try again.');
    const content = new Uint8Array(await result.arrayBuffer());
    if (content.length !== part.size) throw new Error('Download interrupted. Please try again.');
    bytes.set(content, offset); offset += content.length; progress(Math.round(offset / manifest.size * 95));
  }
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((value) => value.toString(16).padStart(2, '0')).join('');
  if (digest !== manifest.sha256) throw new Error('The download could not be verified. Please try again.');
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.microsoft.portable-executable' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = manifest.filename;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); progress(100);
}
