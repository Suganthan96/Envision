-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Adds domain-selection tracking with a hard cap of 6 students ("member" role) per domain.
-- Mentors are unlimited (one domain each, no shared cap).

create table if not exists public.domain_selections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  login_id text not null,
  role text not null check (role in ('mentor', 'member')),
  domain_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.domain_selections enable row level security;
-- No policies are added on purpose: the table is only reachable through the
-- security definer RPCs below, never directly via the anon key.

create or replace function public.select_domain(
  p_user_id text,
  p_login_id text,
  p_role text,
  p_domain_id text
)
returns table (ok boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  already_this_domain boolean;
  current_count integer;
begin
  if p_role = 'member' then
    perform pg_advisory_xact_lock(hashtext(p_domain_id));

    select exists (
      select 1 from public.domain_selections
      where user_id = p_user_id and role = 'member' and domain_id = p_domain_id
    ) into already_this_domain;

    if not already_this_domain then
      select count(*) into current_count
      from public.domain_selections
      where domain_id = p_domain_id and role = 'member';

      if current_count >= 6 then
        return query select false, 'Domain full'::text;
        return;
      end if;
    end if;
  end if;

  insert into public.domain_selections (user_id, login_id, role, domain_id)
  values (p_user_id, p_login_id, p_role, p_domain_id)
  on conflict (user_id, role)
  do update set domain_id = excluded.domain_id, login_id = excluded.login_id, created_at = now();

  return query select true, 'ok'::text;
end;
$$;

create or replace function public.get_domain_counts()
returns table (domain_id text, selected_count bigint)
language sql
security definer
set search_path = public
as $$
  select domain_id, count(*) as selected_count
  from public.domain_selections
  where role = 'member'
  group by domain_id;
$$;

create or replace function public.get_my_domain_selection(
  p_user_id text,
  p_role text
)
returns table (domain_id text)
language sql
security definer
set search_path = public
as $$
  select domain_id
  from public.domain_selections
  where user_id = p_user_id and role = p_role
  limit 1;
$$;

grant execute on function public.select_domain(text, text, text, text) to anon;
grant execute on function public.get_domain_counts() to anon;
grant execute on function public.get_my_domain_selection(text, text) to anon;
