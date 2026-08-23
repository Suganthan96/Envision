-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Lets the admin see who, of a given role, has NOT yet made a domain
-- selection — the complement of admin_list_domain_selections (which only
-- returns people who already have a domain_selections row).

create or replace function public.admin_list_pending_domain_selections(
  p_admin_user_id uuid,
  p_role text
)
returns table (login_id text, name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_role not in ('mentor', 'member') then
    raise exception 'Invalid role';
  end if;

  return query
  select u.login_id, u.name
  from public.app_users u
  where u.role = p_role
    and not exists (
      select 1 from public.domain_selections ds
      where ds.user_id = u.id and ds.role = p_role
    )
  order by u.login_id;
end;
$$;

grant execute on function public.admin_list_pending_domain_selections(uuid, text) to anon;
