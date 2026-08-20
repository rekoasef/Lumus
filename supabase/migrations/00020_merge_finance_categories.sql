-- ============================================================
-- MIGRATION 00020 — UNIFICAR CATEGORIAS
-- ============================================================
-- Con el tiempo se acumulan categorias que significan lo mismo ("Salario" y
-- "Sueldo"). Hasta ahora no habia forma de juntarlas: el soft delete de
-- `finance_categories` OCULTA la categoria pero no unifica nada — las
-- transacciones siguen apuntando a la vieja, asi que en reportes y
-- presupuestos siguen apareciendo separadas.
--
-- Unificar de verdad implica reasignar tres tablas y despues borrar el
-- origen. Son varios UPDATE que tienen que pasar todos o ninguno, y el
-- cliente de Supabase no maneja transacciones multi-statement: por eso va
-- como funcion.
--
-- SECURITY INVOKER (el default) a proposito: corre con los permisos del
-- usuario, asi que RLS sigue aplicando en las cuatro tablas y no hace falta
-- otra funcion privilegiada como las que se limparon en 00017.
-- ============================================================

create or replace function merge_finance_categories(p_source uuid, p_target uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_user            uuid := auth.uid();
  v_source          finance_categories%rowtype;
  v_target          finance_categories%rowtype;
  v_transactions    int;
  v_tx_visible      int;
  v_recurring       int;
  v_budgets_merged  int;
  v_budgets_moved   int;
begin
  if v_user is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_source = p_target then
    raise exception 'No podés unificar una categoría consigo misma' using errcode = '22023';
  end if;

  select * into v_source from finance_categories
   where id = p_source and user_id = v_user and deleted_at is null;
  if not found then
    raise exception 'La categoría de origen no existe' using errcode = '22023';
  end if;

  select * into v_target from finance_categories
   where id = p_target and user_id = v_user and deleted_at is null;
  if not found then
    raise exception 'La categoría de destino no existe' using errcode = '22023';
  end if;

  if v_source.type <> v_target.type then
    raise exception 'No podés unificar una categoría de % con una de %', v_source.type, v_target.type
      using errcode = '22023';
  end if;

  -- Cuantas de las que se van a mover ve el usuario en pantalla. Se informan
  -- las dos: si solo devolvieramos el total, alguien con muchas transacciones
  -- borradas veria un numero que no se corresponde con nada de lo que ve.
  select count(*) into v_tx_visible
    from transactions
   where category_id = p_source and user_id = v_user and deleted_at is null;

  -- El UPDATE, en cambio, va SIN filtrar `deleted_at` a proposito: si mas
  -- adelante se restaura una transaccion borrada, tiene que apuntar a una
  -- categoria que siga existiendo.
  update transactions set category_id = p_target
   where category_id = p_source and user_id = v_user;
  get diagnostics v_transactions = row_count;

  update recurring_transactions set category_id = p_target
   where category_id = p_source and user_id = v_user;
  get diagnostics v_recurring = row_count;

  -- Presupuestos: `budgets` tiene unique(user_id, category_id, month, year),
  -- asi que si las dos categorias tienen presupuesto para el mismo mes hay
  -- colision. Se SUMAN los montos — es lo que refleja lo que realmente se
  -- gastaba entre las dos — y se borra el del origen.
  with conflictivos as (
    select s.id as source_id, s.amount as source_amount, t.id as target_id
    from budgets s
    join budgets t
      on  t.user_id     = s.user_id
      and t.category_id = p_target
      and t.year        = s.year
      and t.month       = s.month
    where s.category_id = p_source
      and s.user_id     = v_user
  ), sumados as (
    update budgets b
       set amount = b.amount + c.source_amount
      from conflictivos c
     where b.id = c.target_id
    returning b.id
  )
  delete from budgets where id in (select source_id from conflictivos);
  get diagnostics v_budgets_merged = row_count;

  -- Los que no chocaban simplemente cambian de categoria.
  update budgets set category_id = p_target
   where category_id = p_source and user_id = v_user;
  get diagnostics v_budgets_moved = row_count;

  -- El origen se oculta, no se borra: las transacciones ya se movieron, pero
  -- la fila sigue existiendo por si algo historico la referencia.
  update finance_categories set deleted_at = now()
   where id = p_source and user_id = v_user;

  return jsonb_build_object(
    'transactions',         v_transactions,
    'transactions_visible', v_tx_visible,
    'recurring',      v_recurring,
    'budgets_moved',  v_budgets_moved,
    'budgets_merged', v_budgets_merged
  );
end;
$$;

revoke execute on function merge_finance_categories(uuid, uuid) from public, anon;
grant  execute on function merge_finance_categories(uuid, uuid) to authenticated;
