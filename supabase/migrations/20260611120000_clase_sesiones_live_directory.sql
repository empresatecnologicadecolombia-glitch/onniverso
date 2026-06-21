-- Directorio público en /3d: alumnos autenticados ven sesiones en vivo de aulas activas.

drop policy if exists "sesiones_select_live_directory" on public.clase_sesiones;

create policy "sesiones_select_live_directory"
  on public.clase_sesiones
  for select
  to authenticated
  using (
    status = 'live'
    and exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.is_active = true
    )
  );
