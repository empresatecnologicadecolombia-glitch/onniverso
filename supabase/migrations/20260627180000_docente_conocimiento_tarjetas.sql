-- Tarjetas de video publicadas por docentes (Conocimiento → Videos educativos + panel docente).

create table if not exists public.docente_conocimiento_tarjetas (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  titulo text not null,
  descripcion text not null default '',
  video_url text not null,
  image_url text not null,
  badge text not null default 'Contenido docente',
  published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists docente_conocimiento_tarjetas_docente_idx
  on public.docente_conocimiento_tarjetas (docente_id, created_at desc);

create index if not exists docente_conocimiento_tarjetas_published_idx
  on public.docente_conocimiento_tarjetas (published, published_at desc nulls last);

alter table public.docente_conocimiento_tarjetas enable row level security;

drop policy if exists "tarjetas_select_published" on public.docente_conocimiento_tarjetas;
drop policy if exists "tarjetas_select_own" on public.docente_conocimiento_tarjetas;
drop policy if exists "tarjetas_insert_own" on public.docente_conocimiento_tarjetas;
drop policy if exists "tarjetas_update_own" on public.docente_conocimiento_tarjetas;
drop policy if exists "tarjetas_delete_own" on public.docente_conocimiento_tarjetas;

create policy "tarjetas_select_published"
  on public.docente_conocimiento_tarjetas for select
  to anon, authenticated
  using (published = true);

create policy "tarjetas_select_own"
  on public.docente_conocimiento_tarjetas for select
  to authenticated
  using (
    docente_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.app_role = 'admin'
    )
  );

create policy "tarjetas_insert_own"
  on public.docente_conocimiento_tarjetas for insert
  to authenticated
  with check (
    docente_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.app_role in ('docente', 'admin')
    )
  );

create policy "tarjetas_update_own"
  on public.docente_conocimiento_tarjetas for update
  to authenticated
  using (
    docente_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.app_role = 'admin'
    )
  )
  with check (
    docente_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.app_role = 'admin'
    )
  );

create policy "tarjetas_delete_own"
  on public.docente_conocimiento_tarjetas for delete
  to authenticated
  using (
    docente_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.app_role = 'admin'
    )
  );
