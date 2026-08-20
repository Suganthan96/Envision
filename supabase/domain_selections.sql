-- Already applied to the project via the Supabase MCP. Kept here for reference /
-- reruns elsewhere. This reflects the CURRENT deployed state, not a linear diff —
-- re-running it top to bottom on a fresh database reproduces the final schema.
--
-- Rules:
--   * Students ("member" role) pick exactly 1 domain, ever. Once set it is
--     permanent — select_domain rejects any attempt to switch.
--   * Mentors pick up to 2 domains. Once a domain is picked it is also
--     permanent — there is no deselect capability for anyone, by design.
--   * Each domain is capped at 6 selections per role (6 members AND,
--     independently, 6 mentors — the two caps don't share the same pool).

create table if not exists public.domain_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  login_id text not null,
  role text not null check (role in ('mentor', 'member')),
  domain_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role, domain_id)
);

alter table public.domain_selections enable row level security;
-- No policies are added on purpose: the table is only reachable through the
-- security definer RPCs below, never directly via the anon key.

create or replace function public.select_domain(
  p_user_id uuid,
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
  existing_domain text;
  already_this_domain boolean;
  my_domain_count integer;
  capacity_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_domain_id));

  select exists (
    select 1 from public.domain_selections
    where user_id = p_user_id and role = p_role and domain_id = p_domain_id
  ) into already_this_domain;

  if already_this_domain then
    return query select true, 'ok'::text;
    return;
  end if;

  if p_role = 'member' then
    select domain_id into existing_domain
    from public.domain_selections
    where user_id = p_user_id and role = 'member'
    limit 1;

    if existing_domain is not null then
      return query select false, 'You have already selected a domain and cannot change it.'::text;
      return;
    end if;

    select count(*) into capacity_count
    from public.domain_selections
    where domain_id = p_domain_id and role = 'member';

    if capacity_count >= 6 then
      return query select false, 'Domain full'::text;
      return;
    end if;
  elsif p_role = 'mentor' then
    select count(*) into my_domain_count
    from public.domain_selections
    where user_id = p_user_id and role = 'mentor';

    if my_domain_count >= 2 then
      return query select false, 'You can select at most 2 domains.'::text;
      return;
    end if;

    select count(*) into capacity_count
    from public.domain_selections
    where domain_id = p_domain_id and role = 'mentor';

    if capacity_count >= 6 then
      return query select false, 'Domain full'::text;
      return;
    end if;
  end if;

  insert into public.domain_selections (user_id, login_id, role, domain_id)
  values (p_user_id, p_login_id, p_role, p_domain_id);

  return query select true, 'ok'::text;
end;
$$;

create or replace function public.get_domain_counts(p_role text)
returns table (domain_id text, selected_count bigint)
language sql
security definer
set search_path = public
as $$
  select domain_id, count(*) as selected_count
  from public.domain_selections
  where role = p_role
  group by domain_id;
$$;

create or replace function public.get_my_domain_selections(p_user_id uuid, p_role text)
returns table (domain_id text)
language sql
security definer
set search_path = public
as $$
  select domain_id
  from public.domain_selections
  where user_id = p_user_id and role = p_role;
$$;

grant execute on function public.select_domain(uuid, text, text, text) to anon;
grant execute on function public.get_domain_counts(text) to anon;
grant execute on function public.get_my_domain_selections(uuid, text) to anon;
