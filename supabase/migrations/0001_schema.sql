-- Deal Room schema: tables, enums, triggers, RLS.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to run once on an empty project.

create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type pipeline_stage as enum ('new', 'contacted', 'research', 'ic', 'term_sheet', 'invested');
create type deal_status    as enum ('active', 'waiting', 'paused');
create type end_state      as enum ('none', 'watchlist', 'passed', 'lost');
create type revisit_bucket as enum ('none', 'backburner', '45d', '90d');
create type person_role    as enum ('founder', 'introducer', 'contact');
create type task_status    as enum ('open', 'done');
create type task_source    as enum ('manual', 'next_action');
create type ai_status      as enum ('pending', 'ok', 'failed', 'skipped');
create type deck_source    as enum ('drive', 'link');

-- ─── Helpers ────────────────────────────────────────────────────────────────

-- "https://www.Acme.com/about" → "acme.com"
create or replace function normalize_domain(url text) returns text
language sql immutable as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(url, ''))), '^[a-z]+://', ''),
      '^www\.|[/?#].*$', '', 'g'
    ), '')
$$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── profiles ───────────────────────────────────────────────────────────────

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  initials    text not null default '',
  created_at  timestamptz not null default now()
);

-- Create a profile whenever a user is added in the Supabase dashboard.
-- Set the user's display name in user metadata as `full_name` (optional).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  name text := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, email, full_name, initials)
  values (
    new.id,
    new.email,
    name,
    upper(left(name, 1) || coalesce(left(split_part(name, ' ', 2), 1), ''))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── companies ──────────────────────────────────────────────────────────────

create table companies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(trim(name)) > 0),
  website             text not null,
  domain              text generated always as (normalize_domain(website)) stored,
  one_liner           text,
  stage               text,
  location            text,
  last_round_stage    text,
  last_round_size     numeric,
  last_round_date     date,
  existing_investors  text[] not null default '{}',
  ai_summary          text,
  revenue_metrics     text,
  traction_metrics    text,
  raise_ask           text,
  thesis_notes        text,
  last_touched        timestamptz not null default now(),
  created_by          uuid references profiles (id) default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index companies_domain_key on companies (domain);

-- ─── people ─────────────────────────────────────────────────────────────────

create table people (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  email       text,
  phone       text,
  linkedin    text,
  notes       text,
  created_by  uuid references profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table company_people (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  person_id   uuid not null references people (id) on delete cascade,
  role        person_role not null,
  created_by  uuid references profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, person_id, role)
);

-- ─── deals ──────────────────────────────────────────────────────────────────

create table deals (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies (id) on delete cascade,
  stage                 text,
  round_size            numeric,
  pipeline_stage        pipeline_stage not null default 'new',
  status                deal_status not null default 'active',
  end_state             end_state not null default 'none',
  pass_reason           text,
  revisit_bucket        revisit_bucket not null default 'none',
  revisit_date          date,
  owner                 uuid references profiles (id) default auth.uid(),
  next_action           text,
  next_action_date      date,
  next_action_task_id   uuid,
  created_by            uuid references profiles (id) default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index deals_company_idx on deals (company_id);

-- 45d / 90d buckets set the revisit date from today when the bucket changes.
create or replace function set_revisit_date() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.revisit_bucket is distinct from old.revisit_bucket then
    if new.revisit_bucket = '45d' then
      new.revisit_date := current_date + 45;
    elsif new.revisit_bucket = '90d' then
      new.revisit_date := current_date + 90;
    elsif new.revisit_bucket = 'none' then
      new.revisit_date := null;
    end if;
  end if;
  return new;
end $$;

create trigger deals_revisit_date
  before insert or update on deals
  for each row execute function set_revisit_date();

-- ─── tasks ──────────────────────────────────────────────────────────────────

create table tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(trim(title)) > 0),
  company_id    uuid references companies (id) on delete cascade,
  deal_id       uuid references deals (id) on delete set null,
  assignee      uuid references profiles (id) default auth.uid(),
  due_date      date,
  status        task_status not null default 'open',
  completed_at  timestamptz,
  source        task_source not null default 'manual',
  created_by    uuid references profiles (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tasks_assignee_idx on tasks (assignee, status);
create index tasks_company_idx on tasks (company_id);

alter table deals
  add constraint deals_next_action_task_fk
  foreign key (next_action_task_id) references tasks (id) on delete set null;

create or replace function set_task_completed_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status = 'open' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger tasks_completed_at
  before insert or update on tasks
  for each row execute function set_task_completed_at();

-- ─── notes ──────────────────────────────────────────────────────────────────

create table notes (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies (id) on delete cascade,
  deal_id         uuid references deals (id) on delete set null,
  raw_transcript  text not null default '',
  attendees       text[] not null default '{}',
  action_items    text,
  ai_summary      text,
  ai_revenue      text,
  ai_traction     text,
  ai_raise_ask    text,
  ai_status       ai_status not null default 'pending',
  ai_error        text,
  created_by      uuid references profiles (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index notes_company_idx on notes (company_id, created_at desc);

-- ─── sector tags ────────────────────────────────────────────────────────────

create table sector_tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  parent_id   uuid references sector_tags (id) on delete cascade,
  level       smallint not null check (level between 1 and 3),
  created_by  uuid references profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Unique name per parent (case-insensitive); top-level tags share the null parent.
create unique index sector_tags_name_key
  on sector_tags (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- Level follows the parent, so the hierarchy can't drift.
create or replace function set_sector_level() returns trigger
language plpgsql as $$
declare
  parent_level smallint;
begin
  if new.parent_id is null then
    new.level := 1;
  else
    select level into parent_level from sector_tags where id = new.parent_id;
    if parent_level >= 3 then
      raise exception 'Sector tags go three levels deep (sector > sub-sector > niche)';
    end if;
    new.level := parent_level + 1;
  end if;
  return new;
end $$;

create trigger sector_tags_level
  before insert or update of parent_id on sector_tags
  for each row execute function set_sector_level();

create table company_sector_tags (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  tag_id      uuid not null references sector_tags (id) on delete cascade,
  created_by  uuid references profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, tag_id)
);

-- Find-or-create a tag path like 'Energy > Battery > LFP' and attach every level to a company.
-- Returns the deepest tag id.
create or replace function add_sector_path(p_company_id uuid, p_path text) returns uuid
language plpgsql as $$
declare
  part text;
  parent uuid := null;
  tag uuid;
begin
  foreach part in array regexp_split_to_array(p_path, '\s*>\s*') loop
    part := trim(part);
    continue when part = '';
    select id into tag from sector_tags
      where coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = coalesce(parent, '00000000-0000-0000-0000-000000000000'::uuid)
        and lower(name) = lower(part);
    if tag is null then
      insert into sector_tags (name, parent_id, level) values (part, parent, 1) returning id into tag;
    end if;
    insert into company_sector_tags (company_id, tag_id) values (p_company_id, tag)
      on conflict (company_id, tag_id) do nothing;
    parent := tag;
    tag := null;
  end loop;
  return parent;
end $$;

-- All tag ids at or below a tag, for board filtering.
create or replace function sector_descendants(p_tag_id uuid) returns setof uuid
language sql stable as $$
  with recursive t as (
    select id from sector_tags where id = p_tag_id
    union all
    select s.id from sector_tags s join t on s.parent_id = t.id
  )
  select id from t
$$;

-- ─── market research ────────────────────────────────────────────────────────

create table market_research (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  url         text,
  title       text,
  body        text,
  created_by  uuid references profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (coalesce(url, title, body) is not null)
);

-- ─── decks ──────────────────────────────────────────────────────────────────

create table decks (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  deal_id     uuid references deals (id) on delete set null,
  url         text not null,
  file_name   text,
  source      deck_source not null default 'link',
  created_by  uuid references profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── updated_at triggers ────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['companies','people','company_people','deals','tasks','notes',
                           'sector_tags','company_sector_tags','market_research','decks'] loop
    execute format('create trigger %I_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ─── last_touched ───────────────────────────────────────────────────────────

-- Any edit to a company bumps its own last_touched (unless the edit set it explicitly).
create or replace function touch_company_self() returns trigger
language plpgsql as $$
begin
  if new.last_touched is not distinct from old.last_touched then
    new.last_touched := now();
  end if;
  return new;
end $$;

create trigger companies_touch
  before update on companies
  for each row execute function touch_company_self();

-- Any insert/update/delete on a child row bumps the parent company.
create or replace function touch_company_from_child() returns trigger
language plpgsql as $$
declare
  cid uuid;
begin
  cid := case when tg_op = 'DELETE' then old.company_id else new.company_id end;
  if cid is not null then
    update companies set last_touched = now() where id = cid;
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['deals','notes','tasks','company_people','company_sector_tags',
                           'market_research','decks'] loop
    execute format('create trigger %I_touch_company after insert or update or delete on %I
                    for each row execute function touch_company_from_child()', t, t);
  end loop;
end $$;

-- ─── RLS: signed-in users can do everything, anonymous nothing ─────────────

do $$
declare t text;
begin
  foreach t in array array['profiles','companies','people','company_people','deals','tasks','notes',
                           'sector_tags','company_sector_tags','market_research','decks'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "authenticated full access" on %I
                    for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Functions called from the app run as the signed-in user.
revoke execute on function add_sector_path(uuid, text) from public, anon;
grant execute on function add_sector_path(uuid, text) to authenticated;
revoke execute on function sector_descendants(uuid) from public, anon;
grant execute on function sector_descendants(uuid) to authenticated;
