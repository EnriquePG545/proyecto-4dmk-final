revoke execute on function public.fn_registrar_compra_hilo(bigint, text, integer, numeric, date, text) from public;
revoke execute on function public.fn_registrar_compra_hilo(bigint, text, integer, numeric, date, text) from anon;
grant execute on function public.fn_registrar_compra_hilo(bigint, text, integer, numeric, date, text) to authenticated;
