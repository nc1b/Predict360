import { describe, it, expect } from 'vitest';
import { validManifest } from './download';
const manifest = { filename: 'Predict360-0.1.0-Windows.exe', size: 10, sha256: 'a'.repeat(64), parts: [{ path: 'windows/0.1.0-123/part-0', size: 10 }] };
describe('desktop download manifest', () => {
  it('accepts only bounded installer parts in the release bucket', () => {
    expect(validManifest(manifest)).toBe(true);
    for (const invalid of [null, {}, { ...manifest, filename: 'malware.js' }, { ...manifest, size: 11 }, { ...manifest, sha256: 'not-a-hash' }, { ...manifest, parts: [{ path: '../../private', size: 10 }] }, { ...manifest, parts: [{ path: 'https://evil.example/part-0', size: 10 }] }]) expect(validManifest(invalid)).toBe(false);
  });
});
