create table if not exists public.financasa_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.financasa_state
add column if not exists user_id uuid references auth.users(id) on delete cascade;

delete from public.financasa_state
where user_id is null;

alter table public.financasa_state
drop constraint if exists financasa_state_pkey;

alter table public.financasa_state
drop column if exists id;

alter table public.financasa_state
alter column user_id set not null;

alter table public.financasa_state
add constraint financasa_state_pkey primary key (user_id);

alter table public.financasa_state enable row level security;

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
