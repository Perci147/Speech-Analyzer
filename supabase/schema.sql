-- Speech Analyzer database setup.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent.

------------------------------------------------------------------------------
-- 1. Practice sessions, one row per analyzed recording, owned by a user.
--    Audio is never stored; only the scenario, question, and AI analysis.
------------------------------------------------------------------------------
create table if not exists public.practice_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  scenario text not null,
  custom_question text,
  analysis jsonb not null
);

create index if not exists practice_sessions_user_created_idx
  on public.practice_sessions (user_id, created_at desc);

-- Row Level Security: each user can only see, add, and delete their own sessions.
alter table public.practice_sessions enable row level security;

drop policy if exists "Users read own sessions" on public.practice_sessions;
create policy "Users read own sessions" on public.practice_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add own sessions" on public.practice_sessions;
create policy "Users add own sessions" on public.practice_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own sessions" on public.practice_sessions;
create policy "Users delete own sessions" on public.practice_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.practice_sessions from anon;
grant select, insert, delete on public.practice_sessions to authenticated;

------------------------------------------------------------------------------
-- 2. Daily analysis counters, used to cap Gemini spend per guest and per user.
--    Only the server (secret key) can touch this table.
------------------------------------------------------------------------------
create table if not exists public.analysis_usage (
  usage_key text not null,          -- "user:<uuid>" or "guest:<hashed ip>"
  usage_day date not null,          -- UTC day
  count integer not null default 0,
  primary key (usage_key, usage_day)
);

alter table public.analysis_usage enable row level security;
-- No policies on purpose: browsers can never read or write usage counters.
revoke all on public.analysis_usage from anon, authenticated;

-- Atomically use one analysis if under the limit. Returns whether it was allowed.
create or replace function public.consume_analysis_quota(p_key text, p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_count integer;
begin
  if p_limit <= 0 then
    return query select false, 0;
    return;
  end if;

  insert into public.analysis_usage as u (usage_key, usage_day, count)
  values (p_key, v_day, 1)
  on conflict (usage_key, usage_day)
    do update set count = u.count + 1
    where u.count < p_limit
  returning u.count into v_count;

  if v_count is null then
    -- Limit already reached: report current usage without incrementing.
    select u.count into v_count
    from public.analysis_usage u
    where u.usage_key = p_key and u.usage_day = v_day;
    return query select false, coalesce(v_count, p_limit);
  else
    return query select true, v_count;
  end if;

  -- Occasionally prune counters older than a week to keep the table small.
  if random() < 0.01 then
    delete from public.analysis_usage where usage_day < v_day - 7;
  end if;
end;
$$;

-- Give back one analysis when the AI call fails, so users are not charged for errors.
create or replace function public.refund_analysis_quota(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.analysis_usage
  set count = greatest(count - 1, 0)
  where usage_key = p_key and usage_day = (now() at time zone 'utc')::date;
$$;

-- Today's usage for one key, for the "2 of 3 left today" display.
create or replace function public.get_analysis_usage(p_key text)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select count from public.analysis_usage
     where usage_key = p_key and usage_day = (now() at time zone 'utc')::date),
    0
  );
$$;

-- Only the server's secret key may call these functions.
revoke execute on function public.consume_analysis_quota(text, integer) from public, anon, authenticated;
revoke execute on function public.refund_analysis_quota(text) from public, anon, authenticated;
revoke execute on function public.get_analysis_usage(text) from public, anon, authenticated;
grant execute on function public.consume_analysis_quota(text, integer) to service_role;
grant execute on function public.refund_analysis_quota(text) to service_role;
grant execute on function public.get_analysis_usage(text) to service_role;
