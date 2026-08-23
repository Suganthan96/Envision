-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- HISTORICAL NOTE: this file originally extended `login` so any login ID
-- shaped like a mentor ID ("3111" + 8 digits) could self-register on the
-- spot using the shared default password ("licet@123"), with no real
-- verification that the person was an authorized mentor. That loophole
-- let 5 unintended accounts get created (including junk ones named "new"
-- / "New") and was closed on 2026-08-23 — see
-- remove_bogus_mentors_and_disable_self_registration below. `login` now
-- only ever matches an existing `app_users` row; no more auto-creation.

create or replace function public.login(
  p_login_id text,
  p_password text,
  p_name text default null
)
returns table (user_id uuid, role text, must_change_password boolean, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched public.app_users%rowtype;
begin
  select * into matched
  from public.app_users u
  where u.login_id = p_login_id
    and u.password_hash = extensions.crypt(p_password, u.password_hash);

  if found then
    return query select matched.id, matched.role, matched.must_change_password, matched.name;
    return;
  end if;

  return;
end;
$$;

grant execute on function public.login(text, text, text) to anon;
