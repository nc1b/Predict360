drop function public.save_activity_day(text, uuid, date, jsonb, bigint);
create function public.save_activity_day(p_user_id text, p_device_id uuid, p_day date, p_summary jsonb, p_revision bigint, p_session_hash text default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_session_hash is not null then
    perform 1 from public.desktop_sessions where token_hash = p_session_hash
      and user_id = p_user_id and expires_at > now() for share;
    if not found then raise exception 'session_revoked'; end if;
  end if;
  insert into public.activity_days (user_id, device_id, day, summary, revision)
  values (p_user_id, p_device_id, p_day, p_summary, p_revision)
  on conflict (user_id, device_id, day) do update
  set summary = excluded.summary, revision = excluded.revision, updated_at = now()
  where excluded.revision > activity_days.revision;
  delete from public.activity_days where user_id = p_user_id and day < current_date - 30;
end;
$$;
revoke all on function public.save_activity_day(text, uuid, date, jsonb, bigint, text) from public, anon, authenticated;
grant execute on function public.save_activity_day(text, uuid, date, jsonb, bigint, text) to service_role;

create function public.delete_activity_account(p_user_id text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.desktop_sessions where user_id = p_user_id;
  delete from public.activity_days where user_id = p_user_id;
  delete from public.desktop_codes where user_id = p_user_id;
end;
$$;
revoke all on function public.delete_activity_account(text) from public, anon, authenticated;
grant execute on function public.delete_activity_account(text) to service_role;
