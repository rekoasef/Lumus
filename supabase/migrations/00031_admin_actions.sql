-- ============================================================
-- MIGRATION 00031 — ACCIONES DE ADMIN: INVITACIONES, CORTESÍAS, FEEDBACK
-- ============================================================
-- Etapa 3 de `G1`. El panel pasa de mirar a controlar: invitar testers,
-- extender o revocar accesos de cortesía y marcar feedback, sin abrir el SQL
-- editor.
--
--
-- ── Invitar en vez de crear cuentas ───────────────────────────────────────
--
-- Hasta hoy había dos caminos y los dos eran malos (ver docs/ADMIN.md):
--
--   1. La persona se registra y queda frenada en /suscripcion hasta que el
--      dueño corre un INSERT. Si no está atento, parece que la app está rota.
--   2. El dueño le crea la cuenta con una contraseña provisoria, que durante un
--      tiempo conocen dos personas.
--
-- Ahora se **pre-autoriza un mail**: `beta_invites`. Cuando alguien se registra
-- con ese mail, el trigger de `auth.users` le da la cortesía en el mismo
-- instante, así que al terminar el onboarding ya entra. Contraseña propia, y el
-- vencimiento cargado desde el día uno (decisión del 2026-08-27: sacarle un
-- acceso indefinido a alguien es una conversación incómoda; uno que vencía
-- desde el principio, no).
--
-- La duración se guarda en días y no como fecha: si alguien acepta la
-- invitación dos semanas tarde, sus tres meses empiezan cuando entra.
--
--
-- ── Todo pasa por funciones, y cada una deja registro ─────────────────────
--
-- Cada acción es una función que **hace el cambio y lo anota en
-- `admin_actions` en la misma transacción**. Un historial que puede perderse
-- una entrada en silencio (el cambio salió, el log no) no sirve para lo único
-- que sirve un historial: saber qué pasó cuando algo no cierra.
--
-- Como en 00030: solo `service_role` las ejecuta, y rechazan cualquier llamada
-- con un `auth.uid()` detrás. El admin se pasa por parámetro porque
-- `service_role` no tiene usuario; lo valida la API route con `isAdmin` antes
-- de llamar.
-- ============================================================


-- ── 1. Tablas ─────────────────────────────────────────────────────────────

create table beta_invites (
  id               uuid primary key default gen_random_uuid(),
  -- Siempre en minúsculas: Supabase guarda así los mails de auth.users.
  email            text not null unique check (email = lower(btrim(email)) and email like '%_@_%'),
  reason           text not null default 'beta tester' check (char_length(btrim(reason)) between 1 and 80),
  -- null = sin vencimiento
  access_days      integer check (access_days is null or access_days between 1 and 730),
  invited_by       uuid references auth.users(id) on delete set null,
  invited_at       timestamptz not null default now(),
  accepted_user_id uuid references auth.users(id) on delete set null,
  accepted_at      timestamptz
);

comment on table beta_invites is
  'Mails pre-autorizados: al registrarse reciben acceso de cortesía. Solo service_role.';

-- RLS sin policies: nadie que no sea service_role lee ni escribe. Un usuario
-- logueado no tiene por qué ver a quién más se invitó.
alter table beta_invites enable row level security;


create table admin_actions (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid references auth.users(id) on delete set null,
  action          text not null check (action in (
                    'invite', 'cancel_invite', 'set_grant', 'revoke_grant', 'set_feedback_status'
                  )),
  -- El mail se copia además del id: si se borra la cuenta, el historial tiene
  -- que seguir diciendo de quién era.
  target_user_id  uuid references auth.users(id) on delete set null,
  target_email    text,
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

comment on table admin_actions is
  'Historial de lo que hicieron los admins desde el panel. Solo service_role.';

create index idx_admin_actions_created_at on admin_actions (created_at desc);

alter table admin_actions enable row level security;


-- ── 2. El trigger que convierte una invitación en acceso ──────────────────
--
-- Corre dentro del INSERT de Supabase Auth, así que **no puede fallar**: si
-- tirara, nadie más se podría registrar en Lumus. Cualquier error se degrada a
-- un warning y el registro sigue; lo peor que pasa es que el invitado queda
-- frenado en /suscripcion, que es exactamente como funcionaba antes.

create or replace function grant_access_from_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.beta_invites%rowtype;
begin
  begin
    select * into v_invite
    from public.beta_invites
    where email = lower(new.email)
      and accepted_user_id is null
    for update;

    if not found then
      return new;
    end if;

    insert into public.free_access_grants (user_id, reason, expires_at)
    values (
      new.id,
      v_invite.reason,
      case when v_invite.access_days is null then null
           else now() + make_interval(days => v_invite.access_days) end
    )
    on conflict (user_id) do nothing;

    update public.beta_invites
    set accepted_user_id = new.id,
        accepted_at      = now()
    where id = v_invite.id;
  exception when others then
    raise warning 'grant_access_from_invite: % (%)', sqlerrm, sqlstate;
  end;

  return new;
end;
$$;

create trigger on_auth_user_created_grant_invite
  after insert on auth.users
  for each row execute function grant_access_from_invite();


-- ── 3. Acciones ───────────────────────────────────────────────────────────

-- Invitar. Si el mail ya tiene cuenta, no tiene sentido esperar a un registro
-- que no va a pasar: se le da el acceso directamente.
create or replace function admin_invite(
  p_admin       uuid,
  p_email       text,
  p_reason      text,
  -- Con default para que el cliente pueda omitirlo: null = sin vencimiento.
  p_access_days integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email   text := lower(btrim(p_email));
  v_user_id uuid;
  v_expires timestamptz := case when p_access_days is null then null
                                else now() + make_interval(days => p_access_days) end;
begin
  if auth.uid() is not null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = v_email;

  if v_user_id is not null then
    insert into public.free_access_grants (user_id, reason, expires_at)
    values (v_user_id, p_reason, v_expires)
    on conflict (user_id) do update
      set reason = excluded.reason, expires_at = excluded.expires_at, granted_at = now();

    insert into public.admin_actions (admin_id, action, target_user_id, target_email, details)
    values (p_admin, 'set_grant', v_user_id, v_email,
            jsonb_build_object('reason', p_reason, 'expires_at', v_expires, 'via', 'invite_existing_account'));

    return 'granted_existing';
  end if;

  insert into public.beta_invites (email, reason, access_days, invited_by)
  values (v_email, p_reason, p_access_days, p_admin)
  on conflict (email) do update
    set reason = excluded.reason,
        access_days = excluded.access_days,
        invited_by = excluded.invited_by,
        invited_at = now();

  insert into public.admin_actions (admin_id, action, target_email, details)
  values (p_admin, 'invite', v_email,
          jsonb_build_object('reason', p_reason, 'access_days', p_access_days));

  return 'invited';
end;
$$;


create or replace function admin_cancel_invite(p_admin uuid, p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if auth.uid() is not null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- Una invitación ya aceptada no se cancela: el acceso ya existe, y lo que
  -- corresponde es revocar la cortesía.
  delete from public.beta_invites
  where id = p_invite_id and accepted_user_id is null
  returning email into v_email;

  if v_email is null then
    return false;
  end if;

  insert into public.admin_actions (admin_id, action, target_email)
  values (p_admin, 'cancel_invite', v_email);

  return true;
end;
$$;


-- Otorgar o cambiar el vencimiento de una cortesía. `details` guarda el
-- vencimiento anterior: "le extendí el acceso" sin el antes no se puede auditar.
create or replace function admin_set_grant(
  p_admin      uuid,
  p_user_id    uuid,
  p_reason     text,
  -- null = sin vencimiento
  p_expires_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email        text;
  v_had_grant    boolean;
  v_prev_expires timestamptz;
begin
  if auth.uid() is not null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    return false;
  end if;

  select true, g.expires_at into v_had_grant, v_prev_expires
  from public.free_access_grants g where g.user_id = p_user_id;

  insert into public.free_access_grants (user_id, reason, expires_at)
  values (p_user_id, p_reason, p_expires_at)
  on conflict (user_id) do update
    set reason = excluded.reason, expires_at = excluded.expires_at, granted_at = now();

  insert into public.admin_actions (admin_id, action, target_user_id, target_email, details)
  values (p_admin, 'set_grant', p_user_id, v_email,
          jsonb_build_object(
            'reason', p_reason,
            'expires_at', p_expires_at,
            'had_grant', coalesce(v_had_grant, false),
            'previous_expires_at', v_prev_expires
          ));

  return true;
end;
$$;


create or replace function admin_revoke_grant(p_admin uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email   text;
  v_reason  text;
  v_expires timestamptz;
begin
  if auth.uid() is not null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- El dueño entra a Lumus por una cortesía ('dueño del proyecto', ver B3).
  -- Revocarse la propia lo deja fuera de su app, y del panel para deshacerlo.
  if p_user_id = p_admin then
    raise exception 'No podés revocar tu propio acceso' using errcode = '42501';
  end if;

  delete from public.free_access_grants g
  where g.user_id = p_user_id
  returning g.reason, g.expires_at into v_reason, v_expires;

  if v_reason is null then
    return false;
  end if;

  select u.email into v_email from auth.users u where u.id = p_user_id;

  insert into public.admin_actions (admin_id, action, target_user_id, target_email, details)
  values (p_admin, 'revoke_grant', p_user_id, v_email,
          jsonb_build_object('reason', v_reason, 'expires_at', v_expires));

  return true;
end;
$$;


create or replace function admin_set_feedback_status(p_admin uuid, p_feedback_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous text;
  v_user_id  uuid;
begin
  if auth.uid() is not null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select f.status, f.user_id into v_previous, v_user_id
  from public.feedback f where f.id = p_feedback_id
  for update;

  if v_previous is null then
    return false;
  end if;

  if v_previous = p_status then
    return true;
  end if;

  update public.feedback set status = p_status where id = p_feedback_id;

  insert into public.admin_actions (admin_id, action, target_user_id, details)
  values (p_admin, 'set_feedback_status', v_user_id,
          jsonb_build_object('feedback_id', p_feedback_id, 'from', v_previous, 'to', p_status));

  return true;
end;
$$;


-- ── 4. Permisos ───────────────────────────────────────────────────────────

revoke execute on function grant_access_from_invite()                           from public, anon, authenticated;
revoke execute on function admin_invite(uuid, text, text, integer)              from public, anon, authenticated;
revoke execute on function admin_cancel_invite(uuid, uuid)                      from public, anon, authenticated;
revoke execute on function admin_set_grant(uuid, uuid, text, timestamptz)       from public, anon, authenticated;
revoke execute on function admin_revoke_grant(uuid, uuid)                       from public, anon, authenticated;
revoke execute on function admin_set_feedback_status(uuid, uuid, text)          from public, anon, authenticated;

grant execute on function admin_invite(uuid, text, text, integer)               to service_role;
grant execute on function admin_cancel_invite(uuid, uuid)                       to service_role;
grant execute on function admin_set_grant(uuid, uuid, text, timestamptz)        to service_role;
grant execute on function admin_revoke_grant(uuid, uuid)                        to service_role;
grant execute on function admin_set_feedback_status(uuid, uuid, text)           to service_role;
