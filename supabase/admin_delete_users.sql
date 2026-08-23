-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Bulk-deletes mentor/member accounts from the admin User Management
-- table. Scoped to role in ('mentor', 'member') on purpose — admin
-- accounts can never be deleted through this RPC, even if their login_id
-- is passed in, as a guard against accidentally locking everyone out.
-- domain_selections rows cascade-delete via the existing FK (ON DELETE
-- CASCADE), so a deleted mentor/member's selections go with them.

create or replace function public.admin_delete_users(
  p_admin_user_id uuid,
  p_target_login_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  delete from public.app_users
  where login_id = any(p_target_login_ids)
    and role in ('mentor', 'member');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.admin_delete_users(uuid, text[]) to anon;
