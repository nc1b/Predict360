import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.2.17';
import { createCloudHandler, readLimited } from './cloud-core.mjs';
import * as activity from './activity.mjs';
import * as validation from './validate.mjs';

const issuer = 'https://destined-pika-103.clerk.accounts.dev';
const origins = ['https://predict360.vercel.app', 'http://localhost:3000', 'http://localhost:5173'];
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
const githubKeys = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const run = async (query: any) => { const { data, error } = await query; if (error) throw new Error('database_error'); return data; };
const repository = {
  saveCode: async (row: any) => {
    await run(db.from('desktop_codes').delete().lt('expires_at', new Date().toISOString()));
    await run(db.from('desktop_sessions').delete().lt('expires_at', new Date().toISOString()));
    return run(db.from('desktop_codes').insert(row));
  },
  consumeCode: async (code: string, challenge: string, now: string) => (await run(db.from('desktop_codes').delete().eq('code_hash', code).eq('challenge', challenge).gt('expires_at', now).select('user_id')))?.[0],
  saveSession: (row: any) => run(db.from('desktop_sessions').insert(row)),
  getSession: async (token: string, now: string) => (await run(db.from('desktop_sessions').select('user_id').eq('token_hash', token).gt('expires_at', now).limit(1)))?.[0],
  deleteSession: (token: string) => run(db.from('desktop_sessions').delete().eq('token_hash', token)),
  deleteUserSessions: (user: string) => run(db.from('desktop_sessions').delete().eq('user_id', user)),
  listDays: (user: string) => run(db.from('activity_days').select('device_id,day,summary,revision,updated_at').eq('user_id', user).gte('day', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).order('day', { ascending: false }).limit(960)),
  saveDays: async (user: string, device: string, revision: number, days: any[], sessionHash: string | null) => {
    for (const day of days) await run(db.rpc('save_activity_day', { p_user_id: user, p_device_id: device, p_day: day.date, p_summary: day, p_revision: revision, p_session_hash: sessionHash }));
  },
  deleteActivity: (user: string) => run(db.rpc('delete_activity_account', { p_user_id: user })),
  deleteDays: (user: string) => run(db.from('activity_days').delete().eq('user_id', user)),
  listCheckins: async (user: string) => (await run(db.from('checkin_summaries').select('summary').eq('user_id', user).order('at', { ascending: false }).limit(30))).reverse().map((row: any) => row.summary),
  saveCheckin: (user: string, summary: any) => run(db.from('checkin_summaries').upsert({ user_id: user, id: summary.id, at: summary.at, summary }, { onConflict: 'user_id,id' })),
  deleteCheckins: (user: string) => run(db.from('checkin_summaries').delete().eq('user_id', user)),
};
const handler = createCloudHandler({ repository, validateDay: activity.validateDay,
  validateFeatures: (features: any) => validation.validateAnalyzeRequest({ keystrokes: [{ kind: 'character', downMs: 0, upMs: 1 }], baseline: { sessions: [{ features }] } }).errors.length === 0,
  verifyWebToken: async (token: string) => {
    const { payload } = await jwtVerify(token, jwks, { issuer, algorithms: ['RS256'], requiredClaims: ['sub', 'exp', 'iat', 'azp'], maxTokenAge: '10m' });
    if (!origins.includes(payload.azp as string)) throw new Error('invalid_origin');
    return payload.sub;
  },
});
Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const headers = new Headers({ 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,content-type,apikey', 'Vary': 'Origin' });
  if (origin && origins.includes(origin)) headers.set('Access-Control-Allow-Origin', origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (origin && !origins.includes(origin)) return new Response('Origin not allowed', { status: 403 });
  if (new URL(request.url).searchParams.get('route') === 'release') {
    try {
      if (request.method !== 'PUT') return new Response('Method not allowed', { status: 405 });
      const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
      const { payload } = await jwtVerify(token, githubKeys, { issuer: 'https://token.actions.githubusercontent.com', audience: 'predict360-releases', algorithms: ['RS256'] });
      if (payload.repository !== 'nc1b/Predict360' || !['push', 'workflow_dispatch'].includes(payload.event_name as string) || !(payload.workflow_ref as string)?.startsWith('nc1b/Predict360/.github/workflows/desktop-build.yml@')) return new Response('Forbidden', { status: 403 });
      const key = new URL(request.url).searchParams.get('path') || '';
      if (!/^windows\/(latest\.json|[A-Za-z0-9._-]+\/part-\d+)$/.test(key)) return new Response('Invalid release path', { status: 400 });
      const bytes = await readLimited(request, 40 * 1024 * 1024);
      if (!bytes) return new Response('Too large', { status: 413 });
      const { error } = await db.storage.from('app-releases').upload(key, bytes, { upsert: key === 'windows/latest.json', contentType: key.endsWith('.json') ? 'application/json' : 'application/octet-stream', cacheControl: key.endsWith('.json') ? '0' : '31536000' });
      return new Response(error ? 'Upload failed' : '{"ok":true}', { status: error ? 503 : 200 });
    } catch { return new Response('Invalid release identity', { status: 401 }); }
  }
  if (Number(request.headers.get('content-length')) > 262144) return new Response('Request too large', { status: 413 });
  const response = await handler(request);
  for (const [name, value] of headers) response.headers.set(name, value);
  return response;
});
