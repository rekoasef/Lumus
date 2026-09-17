-- ============================================================
-- MIGRATION 00037 — LO LEGAL: TÉRMINOS ACEPTADOS Y SOLICITUDES DE BAJA
-- ============================================================
-- Dos piezas de `H6`, lo que exige cobrar en Argentina (ver
-- `docs/LANZAMIENTO.md`, sección 3):
--
-- 1. **Qué versión de los términos aceptó cada uno, y cuándo.** No alcanza con
--    un checkbox en el registro: si los términos cambian, hay que poder pedir
--    que se acepten de nuevo, y para eso hay que saber qué aceptó cada uno.
--    Los términos y la política de privacidad se aceptan juntos, con una sola
--    versión (`TERMS_VERSION` en `src/lib/legal/owner.ts`).
--
-- 2. **Las solicitudes del botón de arrepentimiento y del botón de baja**
--    (Ley 24.240, Disposición 954/2025 modificada por la 3/2026). Se hacen sin
--    login, y el proveedor tiene que dar un código de identificación dentro de
--    las 24 horas. Cada solicitud queda registrada con su código, aunque la
--    cuenta se borre después: es la constancia de que se pidió y se cumplió.
-- ============================================================


-- ── 1. Aceptaciones ───────────────────────────────────────────────────────

create table legal_acceptances (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  document    text not null check (document in ('terminos')),
  version     text not null check (length(version) between 1 and 40),
  -- 'registro': el checkbox al crear la cuenta. 'app': quien ya tenía cuenta,
  -- o una versión nueva aceptada al entrar.
  source      text not null check (source in ('registro', 'app')),
  accepted_at timestamptz not null default now(),
  unique (user_id, document, version)
);

alter table legal_acceptances enable row level security;

-- El usuario ve lo suyo y acepta por sí mismo. No edita ni borra: una
-- aceptación es una constancia.
create policy "users read own acceptances" on legal_acceptances
  for select to authenticated
  using (user_id = auth.uid());

create policy "users accept for themselves" on legal_acceptances
  for insert to authenticated
  with check (user_id = auth.uid());


-- ── 2. La aceptación del registro ─────────────────────────────────────────
--
-- El registro corre en el navegador (`supabase.auth.signUp`): no hay sesión
-- todavía para insertar la fila. La versión viaja en los metadatos del alta y
-- este trigger la copia. Si alguien se registra salteando el formulario, no
-- queda fila, y el proxy le pide aceptar antes de usar la app.
--
-- Mismo cuidado que `grant_access_from_invite` (00031): corre dentro del alta
-- de Supabase Auth, y si tirara, **nadie se podría registrar**. Todo error se
-- degrada a un warning.

create or replace function record_terms_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text := new.raw_user_meta_data ->> 'terms_version';
begin
  begin
    if v_version is not null and length(v_version) between 1 and 40 then
      insert into public.legal_acceptances (user_id, document, version, source)
      values (new.id, 'terminos', v_version, 'registro')
      on conflict (user_id, document, version) do nothing;
    end if;
  exception when others then
    raise warning 'record_terms_acceptance: % (%)', sqlerrm, sqlstate;
  end;

  return new;
end;
$$;

revoke execute on function record_terms_acceptance() from public, anon, authenticated;

create trigger on_auth_user_created_record_terms
  after insert on auth.users
  for each row execute function record_terms_acceptance();


-- ── 3. Solicitudes de arrepentimiento y de baja ───────────────────────────

create table consumer_requests (
  id                 uuid primary key default gen_random_uuid(),
  -- Lo que se le da a la persona en el momento. Único y legible.
  code               text not null unique,
  kind               text not null check (kind in ('arrepentimiento', 'baja')),
  email              text not null check (length(email) between 3 and 320),
  -- La cuenta que corresponde al mail, si hay. Sobrevive al borrado de la
  -- cuenta (queda en null): la constancia no se pierde.
  user_id            uuid references auth.users(id) on delete set null,
  reason             text check (length(reason) <= 1000),
  -- recibida:   se dio el código y se mandó el link de confirmación
  -- sin_cuenta: el mail no es de ninguna cuenta; se dio el código igual
  -- confirmada: la persona confirmó desde su mail y se ejecutó la baja
  -- resuelta:   el dueño la cerró (por ejemplo, después de un reembolso)
  status             text not null default 'recibida'
                     check (status in ('recibida', 'sin_cuenta', 'confirmada', 'resuelta')),
  -- Se guarda el hash, nunca el token: quien lea la tabla no puede confirmar
  -- una baja ajena.
  confirm_token_hash text unique,
  confirm_expires_at timestamptz,
  outcome            text check (length(outcome) <= 500),
  created_at         timestamptz not null default now(),
  confirmed_at       timestamptz,
  resolved_at        timestamptz
);

-- Sin policies: solo `service_role` (las rutas públicas y el panel de admin).
alter table consumer_requests enable row level security;

-- Para frenar a quien manda solicitudes en ráfaga al mismo mail.
create index idx_consumer_requests_email_created on consumer_requests (email, created_at desc);
