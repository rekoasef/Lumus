-- ============================================================
-- MÓDULO BILLING — paywall con Mercado Pago Suscripciones
-- ============================================================
-- Tabla separada de `subscriptions` (que es de finanzas personales,
-- vencimientos tipo Netflix). Esta es la suscripción paga a Lumus.

create table billing_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  mp_preapproval_id  text,
  status             text not null default 'pending', -- 'pending' | 'authorized' | 'paused' | 'cancelled'
  amount             numeric(12,2) not null,
  currency           text not null default 'ARS',
  next_payment_date  date,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique(user_id)
);

create index idx_billing_subscriptions_user_id on billing_subscriptions(user_id);

alter table billing_subscriptions enable row level security;

-- El usuario puede leer su propia suscripción
create policy "users can read own subscription" on billing_subscriptions
  for select using (auth.uid() = user_id);

-- El usuario puede crear su fila inicial 'pending' (arranca el checkout)
create policy "users can insert own pending subscription" on billing_subscriptions
  for insert with check (auth.uid() = user_id and status = 'pending');

-- El usuario puede reintentar el checkout (nuevo preapproval_id) mientras
-- la fila siga 'pending' — no puede tocarla una vez que el webhook la pasó
-- a 'authorized'/'paused'/'cancelled'.
create policy "users can retry own pending subscription" on billing_subscriptions
  for update using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

-- Sin más policies de update para el usuario: solo el webhook (service_role,
-- que bypassea RLS) puede pasar el estado a 'authorized'/'paused'/'cancelled'.
