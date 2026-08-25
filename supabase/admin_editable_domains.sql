-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Moves the program's "themes" (previously the hardcoded DOMAINS array in
-- lib/domains.ts) into the DB, editable from /admin/domains. The id
-- column is a slug auto-derived from the title on creation and is
-- immutable afterward (it's referenced by domain_selections.domain_id and
-- domain_capacities.domain_id) — only title/description/icon/sdgs are
-- editable via admin_update_domain.
--
-- admin_add_domain also seeds a default domain_capacities row (6/7) for
-- the new theme so capacity editing works immediately without a null gap.
-- admin_delete_domain refuses to delete a theme that already has
-- domain_selections rows, to avoid silently orphaning student/mentor
-- picks — it only ever deletes themes nobody has chosen yet.

create table if not exists public.domains (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null check (icon in (
    'water-energy','home','campus','city','agriculture','health','waste','ai-social','climate','inclusive'
  )),
  sdgs integer[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.domains (id, title, description, icon, sdgs, sort_order) values
  ('water-clean-energy', 'Smart Water & Clean Energy for a Sustainable Future', 'Water purification, leakage detection, rainwater harvesting, smart irrigation, water-quality monitoring, renewable energy, energy harvesting, smart power management, and energy-efficient technologies.', 'water-energy', '{6,7,9,12,13,14}', 1),
  ('smart-home-automation', 'Smart & Sustainable Home Automation', 'Smart water use, energy saving, waste reduction, sustainable homes/campuses.', 'home', '{6,7,11,12,13}', 2),
  ('campus-360', 'Campus 360: One Intelligent Ecosystem', 'Unified campus platform, AI/IoT integration, smart classrooms, predictive maintenance, resource optimization, digital services, sustainability tracking, and real-time campus analytics.', 'campus', '{4,9,11,12,13}', 3),
  ('future-ready-cities', 'Future-Ready Cities & Communities', 'Smart traffic, intelligent parking, public safety, disaster-resilient infrastructure, accessible public spaces.', 'city', '{9,11,13}', 4),
  ('smart-agriculture', 'Smart Agriculture & Food Security', 'Precision farming, crop monitoring, automated irrigation, food storage, agricultural waste utilisation.', 'agriculture', '{2,6,8,12,13,15}', 5),
  ('health-wellbeing', 'Health, Well-being & Assistive Technology', 'Low-cost healthcare devices, assistive technologies, elderly care, accessibility solutions, preventive health.', 'health', '{3,5,10}', 6),
  ('waste-to-value', 'Waste to Value', 'Waste segregation, recycling, upcycling, e-waste management, converting waste into useful products.', 'waste', '{9,11,12,13,14,15}', 7),
  ('ai-social-good', 'AI for Social Good', 'AI/ML solutions for accessibility, education, safety, agriculture, disaster management and public services.', 'ai-social', '{4,5,8,10,11,16}', 8),
  ('climate-resilience', 'Climate Resilience & Disaster Management', 'Flood prediction, early-warning systems, fire detection, heat mitigation, coastal protection, emergency response.', 'climate', '{11,13,14,15}', 9),
  ('inclusive-innovation', 'Inclusive Innovation for a Better Society', 'Solutions for rural communities, smart education access, livelihoods, gender inclusion and community empowerment.', 'inclusive', '{1,4,5,8,10,16,17}', 10)
on conflict (id) do nothing;

alter table public.domains enable row level security;
-- No policies on purpose: only reachable through the security definer
-- RPCs below, never directly via the anon key.

create or replace function public.get_domains()
returns table (id text, title text, description text, icon text, sdgs integer[], sort_order integer)
language sql
security definer
set search_path = public
as $$
  select id, title, description, icon, sdgs, sort_order from public.domains order by sort_order, title;
$$;

create or replace function public.admin_add_domain(
  p_admin_user_id uuid,
  p_title text,
  p_description text,
  p_icon text,
  p_sdgs integer[]
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_base text;
  v_suffix integer := 1;
  v_next_sort integer;
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_title is null or trim(p_title) = '' then
    raise exception 'A title is required';
  end if;

  if p_icon not in ('water-energy','home','campus','city','agriculture','health','waste','ai-social','climate','inclusive') then
    raise exception 'Invalid icon';
  end if;

  v_base := lower(regexp_replace(regexp_replace(trim(p_title), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'));
  if v_base = '' then
    v_base := 'domain';
  end if;
  v_id := v_base;
  while exists (select 1 from public.domains where id = v_id) loop
    v_suffix := v_suffix + 1;
    v_id := v_base || '-' || v_suffix;
  end loop;

  select coalesce(max(sort_order), 0) + 1 into v_next_sort from public.domains;

  insert into public.domains (id, title, description, icon, sdgs, sort_order)
  values (v_id, trim(p_title), coalesce(trim(p_description), ''), p_icon, coalesce(p_sdgs, '{}'), v_next_sort);

  insert into public.domain_capacities (domain_id, student_capacity, mentor_capacity)
  values (v_id, 6, 7)
  on conflict (domain_id) do nothing;

  return v_id;
end;
$$;

create or replace function public.admin_update_domain(
  p_admin_user_id uuid,
  p_id text,
  p_title text,
  p_description text,
  p_icon text,
  p_sdgs integer[]
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

  if p_title is null or trim(p_title) = '' then
    raise exception 'A title is required';
  end if;

  if p_icon not in ('water-energy','home','campus','city','agriculture','health','waste','ai-social','climate','inclusive') then
    raise exception 'Invalid icon';
  end if;

  update public.domains
  set title = trim(p_title),
      description = coalesce(trim(p_description), ''),
      icon = p_icon,
      sdgs = coalesce(p_sdgs, '{}'),
      updated_at = now()
  where id = p_id;

  return found;
end;
$$;

create or replace function public.admin_delete_domain(
  p_admin_user_id uuid,
  p_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_selection_count integer;
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  select count(*) into v_selection_count from public.domain_selections where domain_id = p_id;
  if v_selection_count > 0 then
    raise exception 'This theme has % existing selection(s) and cannot be deleted', v_selection_count;
  end if;

  delete from public.domain_capacities where domain_id = p_id;
  delete from public.domains where id = p_id;

  return found;
end;
$$;

grant execute on function public.get_domains() to anon;
grant execute on function public.admin_add_domain(uuid, text, text, text, integer[]) to anon;
grant execute on function public.admin_update_domain(uuid, text, text, text, text, integer[]) to anon;
grant execute on function public.admin_delete_domain(uuid, text) to anon;
