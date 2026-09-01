-- Mentor profile: an avatar photo (stored as a data: URI, resized/compressed
-- client-side before upload) and a short bio, editable from the mentor's own
-- dashboard and shown to their assigned team on the student dashboard.
-- Already applied to the project via the Supabase MCP; kept here for
-- reference / reruns elsewhere.

alter table public.app_users
  add column if not exists avatar_url text,
  add column if not exists bio text;

-- Generous but bounded caps so a runaway upload can't bloat the table.
alter table public.app_users
  drop constraint if exists app_users_avatar_url_length_check;
alter table public.app_users
  add constraint app_users_avatar_url_length_check
  check (avatar_url is null or length(avatar_url) <= 2000000);

alter table public.app_users
  drop constraint if exists app_users_bio_length_check;
alter table public.app_users
  add constraint app_users_bio_length_check
  check (bio is null or length(bio) <= 1000);

create or replace function public.get_mentor_profile(p_user_id uuid)
returns table (avatar_url text, bio text)
language sql
security definer
set search_path = public
as $$
  select avatar_url, bio from public.app_users where id = p_user_id;
$$;

create or replace function public.update_mentor_profile(
  p_user_id uuid,
  p_avatar_url text,
  p_bio text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_avatar_url is not null and length(p_avatar_url) > 2000000 then
    raise exception 'Photo is too large';
  end if;
  if p_bio is not null and length(p_bio) > 1000 then
    raise exception 'Description is too long';
  end if;

  update public.app_users
  set avatar_url = p_avatar_url,
      bio = p_bio,
      updated_at = now()
  where id = p_user_id and role = 'mentor';

  return found;
end;
$$;

-- mentor_user_id is included so callers (e.g. the admin team-profile detail
-- page) can link through to that mentor's own profile page.
create or replace function public.get_my_mentor(p_student_user_id uuid)
returns table (mentor_user_id uuid, name text, login_id text, avatar_url text, bio text)
language sql
security definer
set search_path = public
as $$
  select a.id, a.name, a.login_id, a.avatar_url, a.bio
  from public.mentor_assignments ma
  join public.app_users a on a.id = ma.mentor_user_id
  where ma.student_user_id = p_student_user_id;
$$;

grant execute on function public.get_mentor_profile(uuid) to anon;
grant execute on function public.update_mentor_profile(uuid, text, text) to anon;
grant execute on function public.get_my_mentor(uuid) to anon;
