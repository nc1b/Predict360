-- Account profile with login tracking, and one row per user per day for the
-- daily check-in's self-reported energy and the AI-written daily analysis.
-- Only the service role (the predict360-sync edge function) can read or write.
create table public.profiles (
  user_id text primary key check (user_id ~ '^user_[A-Za-z0-9]+$'),
  display_name text check (length(display_name) <= 100),
  timezone text check (length(timezone) <= 64),
  first_seen_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  login_count integer not null default 1 check (login_count >= 0),
  last_client text check (last_client in ('web', 'desktop'))
);

create table public.daily_entries (
  user_id text not null,
  day date not null,
  energy text check (energy in ('low', 'steady', 'good')),
  analysis text check (length(analysis) between 1 and 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index daily_entries_user_day_idx on public.daily_entries (user_id, day desc);

alter table public.profiles enable row level security;
alter table public.daily_entries enable row level security;
revoke all on public.profiles, public.daily_entries from anon, authenticated;
grant all on public.profiles, public.daily_entries to service_role;

create function public.record_login(p_user_id text, p_display_name text, p_timezone text, p_client text)
returns public.profiles language sql security invoker set search_path = '' as $$
  insert into public.profiles (user_id, display_name, timezone, last_client)
  values (p_user_id, p_display_name, p_timezone, p_client)
  on conflict (user_id) do update set
    display_name = coalesce(excluded.display_name, profiles.display_name),
    timezone = coalesce(excluded.timezone, profiles.timezone),
    last_client = excluded.last_client,
    last_login_at = now(),
    login_count = profiles.login_count + 1
  returning *;
$$;
revoke all on function public.record_login(text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_login(text, text, text, text) to service_role;

-- Partial update: a null argument leaves that column unchanged, so energy and
-- analysis can be saved independently. Keeps 90 days per user.
create function public.save_daily_entry(p_user_id text, p_day date, p_set_energy boolean, p_energy text, p_analysis text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.daily_entries (user_id, day, energy, analysis)
  values (p_user_id, p_day, case when p_set_energy then p_energy end, p_analysis)
  on conflict (user_id, day) do update set
    energy = case when p_set_energy then excluded.energy else daily_entries.energy end,
    analysis = coalesce(excluded.analysis, daily_entries.analysis),
    updated_at = now();
  delete from public.daily_entries where user_id = p_user_id and day < current_date - 90;
end;
$$;
revoke all on function public.save_daily_entry(text, date, boolean, text, text) from public, anon, authenticated;
grant execute on function public.save_daily_entry(text, date, boolean, text, text) to service_role;
