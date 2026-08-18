-- Una meta de ahorro puede juntar plata de varias billeteras a la vez
-- (ej: "Cambio de vida" ahorrando en la billetera de dólares y en la de ahorro en pesos).

create table saving_goal_wallets (
  goal_id   uuid not null references saving_goals(id) on delete cascade,
  wallet_id uuid not null references wallets(id) on delete cascade,
  primary key (goal_id, wallet_id)
);

alter table saving_goal_wallets enable row level security;

create policy "users can manage own goal wallets" on saving_goal_wallets
  for all using (
    exists (select 1 from saving_goals sg where sg.id = goal_id and sg.user_id = auth.uid())
  )
  with check (
    exists (select 1 from saving_goals sg where sg.id = goal_id and sg.user_id = auth.uid())
  );

-- Migrar los vínculos existentes (una billetera por meta) a la tabla nueva
insert into saving_goal_wallets (goal_id, wallet_id)
select id, wallet_id from saving_goals where wallet_id is not null;

alter table saving_goals drop column wallet_id;
