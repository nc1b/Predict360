'use strict';
const config = require('../config/public.json');
async function verifyAiRequest(req) {
  const authorization = req.get('Authorization');
  if (!authorization || !/^Bearer \S+$/.test(authorization)) return false;
  const response = await fetch(`${config.cloudUrl}?route=session`, {
    headers: { apikey: config.publishableKey, Authorization: authorization }, signal: AbortSignal.timeout(5000),
  });
  await response.arrayBuffer();
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error('auth_unavailable');
  return true;
}
module.exports = { verifyAiRequest };
