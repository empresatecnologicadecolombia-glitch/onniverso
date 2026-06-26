-- Recursos subidos por docentes (Cloudinary) en la sección Conocimiento.

create table if not exists public.docente_conocimiento_recursos (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('video', 'pdf', 'glb')),
  titulo text not null,
  resource_url text not null,
  public_id text,
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists docente_conocimiento_recursos_docente_idx
  on public.docente_conocimiento_recursos (docente_id, created_at desc);

alter table public.docente_conocimiento_recursos enable row level security;

drop policy if exists "docente_recursos_select_own" on public.docente_conocimiento_recursos;
drop policy if exists "docente_recursos_insert_own" on public.docente_conocimiento_recursos;
drop policy if exists "docente_recursos_delete_own" on public.docente_conocimiento_recursos;

create policy "docente_recursos_select_own"
  on public.docente_conocimiento_recursos for select
  to authenticated
  using (
    docente_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.app_role = 'admin'
    )
  );

create policy "docente_recursos_insert_own"
  on public.docente_conocimiento_recursos for insert
  to authenticated
  with check (
    docente_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.app_role in ('docente', 'admin')
    )
  );

create policy "docente_recursos_delete_own"
  on public.docente_conocimiento_recursos for delete
  to authenticated
  using (
    docente_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.app_role = 'admin'
    )
  );

create or replace function public.guard_docente_conocimiento_video_limit()
returns trigger
language plpgsql
as $$
declare
  video_count int;
begin
  if new.tipo <> 'video' then
    return new;
  end if;

  select count(*)::int into video_count
  from public.docente_conocimiento_recursos
  where docente_id = new.docente_id and tipo = 'video';

  if video_count >= 5 then
    raise exception 'VIDEO_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_docente_conocimiento_video_limit_trg on public.docente_conocimiento_recursos;

create trigger guard_docente_conocimiento_video_limit_trg
  before insert on public.docente_conocimiento_recursos
  for each row
  execute function public.guard_docente_conocimiento_video_limit();
