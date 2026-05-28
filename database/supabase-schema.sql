create table if not exists public.financasa_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.financasa_state enable row level security;

drop policy if exists "financasa_state_read" on public.financasa_state;
drop policy if exists "financasa_state_insert" on public.financasa_state;
drop policy if exists "financasa_state_update" on public.financasa_state;

create policy "financasa_state_read"
on public.financasa_state
for select
to anon, authenticated
using (id = 'default');

create policy "financasa_state_insert"
on public.financasa_state
for insert
to anon, authenticated
with check (id = 'default');

create policy "financasa_state_update"
on public.financasa_state
for update
to anon, authenticated
using (id = 'default')
with check (id = 'default');
