create table public.activity_days (
  user_id text not null,
  device_id uuid not null,
  day date not null,
  summary jsonb not null check (jsonb_typeof(summary) = 'object'),
  revision bigint not null check (revision >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id, day)
);
create index activity_days_user_day_idx on public.activity_days (user_id, day desc);

create table public.checkin_summaries (
  user_id text not null,
  id text not null check (length(id) between 1 and 100),
  at timestamptz not null,
  summary jsonb not null check (jsonb_typeof(summary) = 'object'),
  primary key (user_id, id)
);
create index checkin_summaries_user_at_idx on public.checkin_summaries (user_id, at desc);

create table public.desktop_codes (
  code_hash text primary key,
  challenge text not null,
  user_id text not null,
  expires_at timestamptz not null
);
create index desktop_codes_expiry_idx on public.desktop_codes (expires_at);
create table public.desktop_sessions (
  token_hash text primary key,
  user_id text not null,
  expires_at timestamptz not null
);
create index desktop_sessions_user_idx on public.desktop_sessions (user_id);
create index desktop_sessions_expiry_idx on public.desktop_sessions (expires_at);

alter table public.activity_days enable row level security;
alter table public.checkin_summaries enable row level security;
alter table public.desktop_codes enable row level security;
alter table public.desktop_sessions enable row level security;
revoke all on public.activity_days, public.checkin_summaries, public.desktop_codes, public.desktop_sessions from anon, authenticated;
grant all on public.activity_days, public.checkin_summaries, public.desktop_codes, public.desktop_sessions to service_role;

create function public.save_activity_day(p_user_id text, p_device_id uuid, p_day date, p_summary jsonb, p_revision bigint)
returns void language sql security invoker set search_path = '' as $$
  insert into public.activity_days (user_id, device_id, day, summary, revision)
  values (p_user_id, p_device_id, p_day, p_summary, p_revision)
  on conflict (user_id, device_id, day) do update
  set summary = excluded.summary, revision = excluded.revision, updated_at = now()
  where excluded.revision > activity_days.revision;
$$;
revoke all on function public.save_activity_day(text, uuid, date, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.save_activity_day(text, uuid, date, jsonb, bigint) to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('app-releases', 'app-releases', true, 52428800)
on conflict (id) do nothing;
