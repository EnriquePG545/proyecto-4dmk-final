alter table public.pelones
add column if not exists rollos_gigantes integer not null default 0;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'pelones_rollos_gigantes_check'
          and conrelid = 'public.pelones'::regclass
    ) then
        alter table public.pelones
        add constraint pelones_rollos_gigantes_check
        check (rollos_gigantes >= 0);
    end if;
end;
$$;

create or replace function public.fn_registrar_compra_hilo(
    p_id_hilo bigint,
    p_codigo_tienda text,
    p_cantidad integer,
    p_precio_unitario numeric,
    p_fecha_compra date default current_date,
    p_detalle_compra text default null
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_hilo record;
    v_id_compra bigint;
begin
    if not public.fn_es_admin() then
        raise exception 'No autorizado';
    end if;

    if p_id_hilo is null then
        raise exception 'Selecciona un hilo valido';
    end if;

    if p_codigo_tienda is null or btrim(p_codigo_tienda) = '' then
        raise exception 'Selecciona un proveedor valido';
    end if;

    if p_cantidad is null or p_cantidad <= 0 then
        raise exception 'La cantidad debe ser mayor a cero';
    end if;

    if p_precio_unitario is null or p_precio_unitario < 0 then
        raise exception 'El precio no puede ser negativo';
    end if;

    if not exists (
        select 1
        from public.proveedores
        where codigo_tienda = p_codigo_tienda
    ) then
        raise exception 'Proveedor no encontrado';
    end if;

    select id_hilo, codigo_hilo, nombre_color
    into v_hilo
    from public.inventario_hilos
    where id_hilo = p_id_hilo
    for update;

    if not found then
        raise exception 'Hilo no encontrado';
    end if;

    insert into public.compras_hilos (
        id_hilo,
        codigo_hilo_snapshot,
        nombre_color_snapshot,
        codigo_tienda,
        cantidad,
        precio_unitario,
        fecha_compra,
        detalle_compra
    )
    values (
        v_hilo.id_hilo,
        v_hilo.codigo_hilo,
        v_hilo.nombre_color,
        p_codigo_tienda,
        p_cantidad,
        p_precio_unitario,
        coalesce(p_fecha_compra, current_date),
        nullif(btrim(coalesce(p_detalle_compra, '')), '')
    )
    returning id_compra_hilo into v_id_compra;

    update public.inventario_hilos
    set stock = stock + p_cantidad,
        codigo_tienda = p_codigo_tienda,
        precio_compra = p_precio_unitario,
        fecha_compra = coalesce(p_fecha_compra, current_date),
        detalle_compra = nullif(btrim(coalesce(p_detalle_compra, '')), '')
    where id_hilo = p_id_hilo;

    return v_id_compra;
end;
$$;

revoke execute on function public.fn_registrar_compra_hilo(bigint, text, integer, numeric, date, text) from public;
revoke execute on function public.fn_registrar_compra_hilo(bigint, text, integer, numeric, date, text) from anon;
grant execute on function public.fn_registrar_compra_hilo(bigint, text, integer, numeric, date, text) to authenticated;
