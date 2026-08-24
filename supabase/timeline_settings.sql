-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Moves the program timeline (previously the hardcoded TIMELINE_PHASES
-- array in lib/timeline.ts) into the DB as a single JSONB blob, editable
-- from /admin/timeline. Every field — phase titles, entry labels, dates,
-- titles, resource, venue, feedback-form flag — is admin-customizable.
--
-- Singleton table, one JSONB column holding the full phases array (same
-- shape as the TimelinePhase[]/TimelineEntry[] types in lib/timeline.ts).
-- The initial row was seeded from the original static TIMELINE_PHASES
-- content — not reproduced here since the DB is now the source of truth
-- and the admin UI is how it's meant to be edited going forward. On a
-- fresh database this table starts with phases = '[]' and the admin adds
-- phases/entries from the editor.

create table if not exists public.timeline_settings (
  id smallint primary key default 1 check (id = 1),
  phases jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.timeline_settings (id, phases)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

alter table public.timeline_settings enable row level security;
-- No policies on purpose: only reachable through the security definer
-- RPCs below, never directly via the anon key.

create or replace function public.get_timeline()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select phases from public.timeline_settings where id = 1;
$$;

create or replace function public.admin_set_timeline(
  p_admin_user_id uuid,
  p_phases jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  update public.timeline_settings
  set phases = p_phases,
      updated_at = now()
  where id = 1;

  return found;
end;
$$;

grant execute on function public.get_timeline() to anon;
grant execute on function public.admin_set_timeline(uuid, jsonb) to anon;
