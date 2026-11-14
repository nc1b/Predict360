// Shared request handler for the hosted sync service. All authorization happens
// before repository access. Desktop credentials are random, revocable tokens.
import { Buffer } from 'node:buffer';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const fail = (message, status = 400) => json({ error: { message } }, status);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const base64url = (bytes) => Buffer.from(bytes).toString('base64url');
export const hash = async (value) => base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
const fieldsOnly = (body, keys) => object(body) && Object.keys(body).every((key) => keys.includes(key));
const uuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const statuses = ['near_baseline', 'some_deviation', 'large_deviation', 'insufficient_samples', 'baseline_missing', 'baseline_insufficient'];
const flags = ['long_key_hold', 'long_sentence_pause', 'uneven_typing_rhythm'];
function validCheckin(body, validateFeatures) {
  if (!fieldsOnly(body, ['id', 'deviceId', 'at', 'features', 'readinessScore', 'status', 'flags'])) return false;
  const scoreOk = body.readinessScore === null || (Number.isInteger(body.readinessScore) && body.readinessScore >= 0 && body.readinessScore <= 100);
  return typeof body.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(body.id) &&
    (body.deviceId === undefined || uuid(body.deviceId)) && typeof body.at === 'string' && Number.isFinite(Date.parse(body.at)) &&
    validateFeatures(body.features) && scoreOk && statuses.includes(body.status) &&
    Array.isArray(body.flags) && body.flags.length <= 3 && body.flags.every((flag) => flags.includes(flag));
}

export async function readLimited(request, limit) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export function createCloudHandler({ repository, verifyWebToken, validateDay, validateFeatures, now = Date.now }) {
  return async function handle(request) {
    const route = new URL(request.url).searchParams.get('route');
    let body;
    if (!['GET', 'DELETE'].includes(request.method)) {
      const bytes = await readLimited(request, 256 * 1024);
      if (!bytes) return fail('Request is too large.', 413);
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return fail('Invalid JSON.'); }
    }
    try {
      if (route === 'exchange' && request.method === 'POST') {
        if (!fieldsOnly(body, ['code', 'verifier']) || !/^[A-Za-z0-9_-]{43}$/.test(body.code) || !/^[A-Za-z0-9_-]{43,128}$/.test(body.verifier)) return fail('Invalid sign-in exchange.');
        const record = await repository.consumeCode(await hash(body.code), await hash(body.verifier), new Date(now()).toISOString());
        if (!record) return fail('This sign-in link expired or was already used.', 401);
        const token = `p360_${random()}`;
        const expiresAt = new Date(now() + 30 * 86400000).toISOString();
        await repository.saveSession({ token_hash: await hash(token), user_id: record.user_id, expires_at: expiresAt });
        return json({ token, userId: record.user_id, expiresAt });
      }

      const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
      if (!token) return fail('Please sign in.', 401);
      let userId;
      const desktop = token.startsWith('p360_');
      if (desktop) {
        const session = await repository.getSession(await hash(token), new Date(now()).toISOString());
        userId = session?.user_id;
      } else {
        try { userId = await verifyWebToken(token); } catch { return fail('Your session expired. Please sign in again.', 401); }
      }
      if (typeof userId !== 'string' || !/^user_[A-Za-z0-9]+$/.test(userId)) return fail('Please sign in again.', 401);

      if (route === 'authorize' && request.method === 'POST') {
        if (desktop) return fail('Use website sign-in to connect another desktop.', 403);
        if (!fieldsOnly(body, ['challenge']) || !/^[A-Za-z0-9_-]{43}$/.test(body.challenge)) return fail('Invalid desktop challenge.');
        const code = random();
        await repository.saveCode({ code_hash: await hash(code), challenge: body.challenge, user_id: userId, expires_at: new Date(now() + 120000).toISOString() });
        return json({ code });
      }
      if (route === 'session' && request.method === 'DELETE') {
        if (desktop) await repository.deleteSession(await hash(token));
        return json({ ok: true });
      }
      if (route === 'session' && request.method === 'GET') return json({ userId });
      if (route === 'activity' && request.method === 'GET') return json({ days: await repository.listDays(userId) });
      if (route === 'activity' && request.method === 'PUT') {
        if (!fieldsOnly(body, ['deviceId', 'revision', 'days']) || !uuid(body.deviceId) || !Number.isSafeInteger(body.revision) || body.revision < 0 || !Array.isArray(body.days) || body.days.length > 30) return fail('Invalid activity snapshot.');
        const dates = new Set();
        for (const day of body.days) {
          const errors = validateDay(day);
          if (errors.length || dates.has(day.date)) return fail('Invalid daily activity summary.');
          dates.add(day.date);
        }
        await repository.saveDays(userId, body.deviceId, body.revision, body.days, desktop ? await hash(token) : null);
        return json({ ok: true });
      }
      if (route === 'activity' && request.method === 'DELETE') {
        // Revoke every desktop so an offline device cannot resurrect deleted data.
        await repository.deleteActivity(userId);
        return json({ ok: true, reconnectRequired: true });
      }
      if (route === 'checkins' && request.method === 'GET') return json({ entries: await repository.listCheckins(userId) });
      if (route === 'checkins' && request.method === 'POST') {
        if (!validCheckin(body, validateFeatures)) return fail('Invalid check-in summary.');
        await repository.saveCheckin(userId, body);
        return json({ ok: true });
      }
      if (route === 'checkins' && request.method === 'DELETE') { await repository.deleteCheckins(userId); return json({ ok: true }); }
      return fail('Unknown sync route.', 404);
    } catch {
      // Database errors can contain credentials or submitted data.
      return fail('Sync is temporarily unavailable. Your local data is safe.', 503);
    }
  };
}
