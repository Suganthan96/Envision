-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Extends the existing `login` RPC so a mentor registration number that
-- doesn't have an account yet can self-register on the spot, as long as:
--   1. The login ID matches the mentor format: "3111" followed by 8 more
--      digits (12 digits total) — see lib/mentor-login-id.ts for the
--      matching client/server-side format check on the Next.js side.
--   2. The password given is the shared default ("licet@123") — the same
--      password every bulk-imported mentor starts with.
--
-- This is an intentional convenience trade-off: it does NOT verify the
-- person is a real, authorized mentor beyond knowing that shared default
-- password and a correctly-shaped ID. That was a deliberate, informed
-- choice for this event (small internal deployment), not an oversight.
--
-- On successful self-registration, a new `app_users` row is created with
-- role = 'mentor', must_change_password = true, and the given name (if
-- any) — so the account then goes through the same forced password-change
-- flow as every pre-seeded mentor, where they set/confirm their name.
--
-- The name is captured ONCE, on that first password-change step, purely
-- for record-keeping (shown on the admin's Mentor Selections page). It is
-- NOT required or checked on login, on this attempt or any future one —
-- only login_id + password are ever checked. p_name exists solely so a
-- freshly self-registered account can be given a name at creation time.
--
-- Existing accounts (any role, any login_id shape) are completely
-- unaffected: the self-registration branch only runs when no matching
-- row exists at all.

create or replace function public.login(
  p_login_id text,
  p_password text,
  p_name text default null
)
returns table (user_id uuid, role text, must_change_password boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched public.app_users%rowtype;
  new_id uuid;
begin
  select * into matched
  from public.app_users u
  where u.login_id = p_login_id
    and u.password_hash = extensions.crypt(p_password, u.password_hash);

  if found then
    return query select matched.id, matched.role, matched.must_change_password;
    return;
  end if;

  if p_login_id ~ '^3111[0-9]{8}$'
     and p_password = 'licet@123'
     and not exists (select 1 from public.app_users where login_id = p_login_id) then
    insert into public.app_users (login_id, role, password_hash, must_change_password, name)
    values (
      p_login_id,
      'mentor',
      extensions.crypt(p_password, extensions.gen_salt('bf', 6)),
      true,
      nullif(trim(p_name), '')
    )
    returning id into new_id;

    return query select new_id, 'mentor'::text, true;
    return;
  end if;

  return;
end;
$$;

grant execute on function public.login(text, text, text) to anon;
