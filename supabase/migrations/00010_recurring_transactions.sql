-- Tabla de transacciones recurrentes (templates, no instancias)
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id     UUID        NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  category_id   UUID        REFERENCES finance_categories(id) ON DELETE SET NULL,
  type          TEXT        NOT NULL CHECK (type IN ('gasto', 'ingreso')),
  amount        NUMERIC     NOT NULL CHECK (amount > 0),
  description   TEXT,
  repeat_type   TEXT        NOT NULL CHECK (repeat_type IN ('daily', 'weekly', 'monthly')),
  -- Para weekly: 0=Lun … 6=Dom. Para monthly: 1-31 (día del mes)
  repeat_day    INTEGER,
  next_date     DATE        NOT NULL,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring_transactions"
  ON recurring_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índice para consultas por usuario
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_date ON recurring_transactions(user_id, next_date);
