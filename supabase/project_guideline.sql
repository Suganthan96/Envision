-- Project guideline: an admin-editable deck of slides shown to students and
-- mentors (read-only there) explaining how to approach the project —
-- background research, problem statement, user identification, idea, and
-- architecture. Mirrors the timeline_settings pattern: the whole slide list
-- is stored as one jsonb column and rewritten wholesale on save, rather than
-- per-row CRUD.
--
-- Slides are either kind='text' (title + body, admin-typed) or kind='image'
-- (title + an uploaded image, e.g. a slide exported from a deck). Separately,
-- admins can attach one downloadable .pptx file for the whole guideline —
-- kept in its own columns (not inside the slides jsonb) since it can be
-- several MB and the slides list is read on every guideline page view, while
-- the file itself is only read when someone clicks Download.
--
-- Already applied to the project via the Supabase MCP; kept here for
-- reference / reruns elsewhere.

create table if not exists public.guideline_settings (
  id smallint primary key default 1 check (id = 1),
  title text not null default 'Phase 1 Pitch Deck Guideline',
  slides jsonb not null default '[]'::jsonb,
  file_name text,
  file_data text,
  updated_at timestamptz not null default now()
);

alter table public.guideline_settings
  add column if not exists title text not null default 'Phase 1 Pitch Deck Guideline';

insert into public.guideline_settings (id, slides)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

alter table public.guideline_settings
  drop constraint if exists guideline_settings_slides_length_check;
alter table public.guideline_settings
  add constraint guideline_settings_slides_length_check
  check (length(slides::text) <= 20000000);

alter table public.guideline_settings
  drop constraint if exists guideline_settings_file_data_length_check;
alter table public.guideline_settings
  add constraint guideline_settings_file_data_length_check
  check (file_data is null or length(file_data) <= 15000000);

-- Title + slide content, not the file — cheap to read on every guideline
-- page view.
create or replace function public.get_project_guideline()
returns table (title text, slides jsonb, file_name text)
language sql
security definer
set search_path = public
as $$
  select title, slides, file_name from public.guideline_settings where id = 1;
$$;

-- The file itself, fetched only by the download route.
create or replace function public.get_project_guideline_file()
returns table (file_name text, file_data text)
language sql
security definer
set search_path = public
as $$
  select file_name, file_data from public.guideline_settings where id = 1;
$$;

create or replace function public.admin_set_project_guideline(
  p_admin_user_id uuid,
  p_title text,
  p_slides jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := nullif(trim(p_title), '');
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if v_title is null then
    raise exception 'A title is required';
  end if;

  if length(p_slides::text) > 20000000 then
    raise exception 'Guideline content is too large';
  end if;

  update public.guideline_settings
  set title = v_title,
      slides = p_slides,
      updated_at = now()
  where id = 1;

  return found;
end;
$$;

create or replace function public.admin_set_project_guideline_file(
  p_admin_user_id uuid,
  p_file_name text,
  p_file_data text
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

  if p_file_data is not null and length(p_file_data) > 15000000 then
    raise exception 'File is too large';
  end if;

  update public.guideline_settings
  set file_name = p_file_name,
      file_data = p_file_data,
      updated_at = now()
  where id = 1;

  return found;
end;
$$;

grant execute on function public.get_project_guideline() to anon;
grant execute on function public.get_project_guideline_file() to anon;
grant execute on function public.admin_set_project_guideline(uuid, text, jsonb) to anon;
grant execute on function public.admin_set_project_guideline_file(uuid, text, text) to anon;
