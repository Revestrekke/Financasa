create extension if not exists pgcrypto;

create table if not exists public.financasa_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financasa_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Minha área financeira',
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financasa_workspace_members (
  workspace_id uuid not null references public.financasa_workspaces(id) on delete cascade,
  user_id uuid not null references public.financasa_profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.financasa_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.financasa_profiles enable row level security;
alter table public.financasa_workspaces enable row level security;
alter table public.financasa_workspace_members enable row level security;
alter table public.financasa_state enable row level security;

create or replace function public.is_financasa_workspace_owner(workspace_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.financasa_workspaces w
    where w.id = workspace_uuid
      and w.owner_id = auth.uid()
  );
$$;

create or replace function public.is_financasa_workspace_member(workspace_uuid uuid, allowed_roles text[] default null)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.financasa_workspace_members m
    where m.workspace_id = workspace_uuid
      and m.user_id = auth.uid()
      and (allowed_roles is null or m.role = any(allowed_roles))
  );
$$;

create or replace function public.is_financasa_system_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (
    array['david@financasa.com.br']
  );
$$;

create or replace function public.can_manage_financasa_workspace(workspace_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_financasa_system_admin()
    or public.is_financasa_workspace_owner(workspace_uuid)
    or public.is_financasa_workspace_member(workspace_uuid, array['admin']);
$$;

drop policy if exists "profiles_select_authenticated" on public.financasa_profiles;
drop policy if exists "profiles_insert_self" on public.financasa_profiles;
drop policy if exists "profiles_update_self" on public.financasa_profiles;

create policy "profiles_select_authenticated"
on public.financasa_profiles
for select
to authenticated
using (true);

create policy "profiles_insert_self"
on public.financasa_profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_self"
on public.financasa_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspaces_select_member" on public.financasa_workspaces;
drop policy if exists "workspaces_insert_owner" on public.financasa_workspaces;
drop policy if exists "workspaces_update_editor" on public.financasa_workspaces;
drop policy if exists "workspaces_delete_owner" on public.financasa_workspaces;

create policy "workspaces_select_member"
on public.financasa_workspaces
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.is_financasa_system_admin()
  or public.is_financasa_workspace_member(id)
);

create policy "workspaces_insert_owner"
on public.financasa_workspaces
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "workspaces_update_editor"
on public.financasa_workspaces
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.is_financasa_workspace_member(id, array['admin','editor'])
)
with check (
  owner_id = auth.uid()
  or public.is_financasa_workspace_member(id, array['admin','editor'])
);

create policy "workspaces_delete_owner"
on public.financasa_workspaces
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "members_select_workspace" on public.financasa_workspace_members;
drop policy if exists "members_insert_owner" on public.financasa_workspace_members;
drop policy if exists "members_update_owner" on public.financasa_workspace_members;
drop policy if exists "members_delete_owner" on public.financasa_workspace_members;

create policy "members_select_workspace"
on public.financasa_workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_financasa_workspace_member(workspace_id)
  or public.can_manage_financasa_workspace(workspace_id)
);

create policy "members_insert_owner"
on public.financasa_workspace_members
for insert
to authenticated
with check (
  public.can_manage_financasa_workspace(workspace_id)
);

create policy "members_update_owner"
on public.financasa_workspace_members
for update
to authenticated
using (
  public.can_manage_financasa_workspace(workspace_id)
)
with check (
  public.can_manage_financasa_workspace(workspace_id)
);

create policy "members_delete_owner"
on public.financasa_workspace_members
for delete
to authenticated
using (
  public.can_manage_financasa_workspace(workspace_id)
);

drop policy if exists "financasa_state_read" on public.financasa_state;
drop policy if exists "financasa_state_insert" on public.financasa_state;
drop policy if exists "financasa_state_update" on public.financasa_state;
drop policy if exists "financasa_state_read_own" on public.financasa_state;
drop policy if exists "financasa_state_insert_own" on public.financasa_state;
drop policy if exists "financasa_state_update_own" on public.financasa_state;

create policy "financasa_state_read_own"
on public.financasa_state
for select
to authenticated
using (user_id = auth.uid());

create policy "financasa_state_insert_own"
on public.financasa_state
for insert
to authenticated
with check (user_id = auth.uid());

create policy "financasa_state_update_own"
on public.financasa_state
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.handle_financasa_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.financasa_profiles (id, email, name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      name = excluded.name,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_financasa on auth.users;

create trigger on_auth_user_created_financasa
after insert on auth.users
for each row execute function public.handle_financasa_new_user();

insert into public.financasa_profiles (id, email, name)
select
  u.id,
  lower(u.email),
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    updated_at = now();

update public.financasa_workspace_members m
set role = 'admin'
from public.financasa_profiles p
where p.id = m.user_id
  and lower(p.email) = 'david@financasa.com.br';
