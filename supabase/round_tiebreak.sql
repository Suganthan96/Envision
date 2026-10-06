-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere.
--
-- Tie-break order per judging round. When two teams have the same total,
-- the one with more marks in the first criterion of this list ranks higher;
-- if that is equal too, the next criterion decides, and so on. The admin sets
-- the order on /admin/scores?round=<id>. Labels that are no longer in the
-- rubric are ignored, and criteria missing from the list follow in rubric
-- order, so an empty list means "rubric order".

alter table public.rubric_presets
  add column if not exists tiebreak text[] not null default '{}';

-- Phase 1 (Immediate Evaluation): Background Study, then User Identification,
-- then Problem Statement, then Solution.
update public.rubric_presets
set tiebreak = array['Background Study', 'User Identification', 'Problem Statement', 'Solution', 'Team work and presentation']
where id = '540dda99-d135-4a4d-89f9-f015b6e87fdd' and tiebreak = '{}';

create or replace function public.admin_set_round_tiebreak(p_admin_user_id uuid, p_preset_id uuid, p_tiebreak text[])
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public._require_admin(p_admin_user_id);
  update public.rubric_presets
  set tiebreak = coalesce(p_tiebreak, '{}'), updated_at = now()
  where id = p_preset_id;
  if not found then raise exception 'That round no longer exists'; end if;
  return true;
end;
$$;

-- The admin's round list carries the tie-break order.
drop function if exists public.admin_list_rubric_presets(uuid);
create function public.admin_list_rubric_presets(p_admin_user_id uuid)
returns table (id uuid, name text, rubric jsonb, is_active boolean, sort_order integer, evaluation_count bigint, scores_published boolean, tiebreak text[])
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query
  select p.id, p.name, p.rubric, p.is_active, p.sort_order,
    (select count(*) from public.evaluations e where e.preset_id = p.id),
    p.scores_published,
    p.tiebreak
  from public.rubric_presets p
  order by p.sort_order, p.created_at;
end;
$$;

-- The leaderboard now also sends each round's criteria and tie-break order,
-- and every team's per-criterion marks, so ties can be broken.
create or replace function public.get_leaderboard(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.app_users where id = p_user_id) then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'max', (select coalesce(sum((r->>'max')::numeric), 0) from jsonb_array_elements(p.rubric) r),
        'criteria', (select coalesce(jsonb_agg(r->>'label'), '[]'::jsonb) from jsonb_array_elements(p.rubric) r),
        'tiebreak', to_jsonb(p.tiebreak)
      ) order by p.sort_order, p.created_at)
      from public.rubric_presets p
      where p.scores_published
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id,
        'loginId', u.login_id,
        'name', u.name,
        'logoVersion', left(md5(u.team_logo_url), 8),
        'projectTitle', u.project_title,
        'domainId', ds.domain_id,
        'mentorName', m.name,
        'mentorUserId', m.id,
        'scores', coalesce((
          select jsonb_object_agg(rs.preset_id, rs.total)
          from public.round_scores rs
          join public.rubric_presets p on p.id = rs.preset_id and p.scores_published
          where rs.student_user_id = u.id
        ), '{}'::jsonb),
        'marks', coalesce((
          select jsonb_object_agg(rs.preset_id, rs.marks)
          from public.round_scores rs
          join public.rubric_presets p on p.id = rs.preset_id and p.scores_published
          where rs.student_user_id = u.id
        ), '{}'::jsonb)
      ))
      from public.app_users u
      left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
      left join public.mentor_assignments ma on ma.student_user_id = u.id
      left join public.app_users m on m.id = ma.mentor_user_id
      where u.role = 'member' and u.hidden is not true
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_set_round_tiebreak(uuid, uuid, text[]) to anon;
grant execute on function public.admin_list_rubric_presets(uuid) to anon;
grant execute on function public.get_leaderboard(uuid) to anon;
