'use strict';
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function validateWeather(body, now = new Date()) {
  return body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).every((key) => ['city', 'date'].includes(key)) &&
    typeof body.city === 'string' && body.city.trim().length >= 2 && body.city.length <= 80 && validDate(body.date) && body.date >= '1940-01-01' && body.date <= now.toISOString().slice(0, 10);
}
async function getWeatherContext(body, { fetcher = fetch, now = Date.now() } = {}) {
  const get = async (url) => {
    const response = await fetcher(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('weather_unavailable');
    return response.json();
  };
  const geo = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geo.search = new URLSearchParams({ name: body.city.trim(), count: '1', language: 'en', format: 'json' }).toString();
  const location = (await get(geo)).results?.[0];
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return null;
  const historical = Date.parse(`${body.date}T00:00:00Z`) < now - 7 * 86400000;
  const url = new URL(historical ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), start_date: body.date, end_date: body.date, hourly: 'surface_pressure', timezone: 'UTC' }).toString();
  const data = await get(url);
  const pressures = data.hourly?.surface_pressure;
  if (!Array.isArray(pressures)) throw new Error('weather_unavailable');
  const values = pressures.filter((value) => Number.isFinite(value) && value >= 200 && value <= 1100);
  if (!values.length) return null;
  const round = (value) => Math.round(value * 10) / 10;
  return { date: body.date, city: [location.name, location.admin1, location.country].filter(Boolean).join(', '),
    timeZone: 'UTC', source: 'https://open-meteo.com/', license: 'CC BY 4.0', kind: historical ? 'modeled_reanalysis' : 'modeled_forecast',
    samples: values.length, meanHpa: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    minHpa: Math.min(...values), maxHpa: Math.max(...values), changeHpa: round(values[values.length - 1] - values[0]),
    limitation: 'Modeled weather context only. There are no migraine outcomes or validated aura predictions in this app.' };
}
module.exports = { validateWeather, getWeatherContext };
