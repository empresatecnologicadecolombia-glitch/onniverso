-- Configuración global de Cloudinary (panel Conocimiento / docentes).
-- Una sola fila (id = 1). El API Secret se guarda aquí para firmar subidas desde el servidor.

create table if not exists public.cloudinary_platform_config (
  id int primary key default 1,
  cloud_name text not null default '',
  api_key text not null default '',
  api_secret text not null default '',
  upload_preset text,
  folder_prefix text not null default 'onnivers/docentes',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint cloudinary_platform_config_single_row check (id = 1)
);

alter table public.cloudinary_platform_config enable row level security;

drop policy if exists "cloudinary_config_docente_select" on public.cloudinary_platform_config;
drop policy if exists "cloudinary_config_docente_insert" on public.cloudinary_platform_config;
drop policy if exists "cloudinary_config_docente_update" on public.cloudinary_platform_config;

create policy "cloudinary_config_docente_select"
  on public.cloudinary_platform_config for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.app_role in ('docente', 'admin')
    )
  );

create policy "cloudinary_config_docente_insert"
  on public.cloudinary_platform_config for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.app_role in ('docente', 'admin')
    )
  );

create policy "cloudinary_config_docente_update"
  on public.cloudinary_platform_config for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.app_role in ('docente', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.app_role in ('docente', 'admin')
    )
  );

insert into public.cloudinary_platform_config (id, cloud_name, folder_prefix)
values (1, 'dmbpk37l5', 'onnivers/docentes')
on conflict (id) do nothing;
