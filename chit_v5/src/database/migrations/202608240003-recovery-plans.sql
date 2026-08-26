CREATE TABLE IF NOT EXISTS recovery_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_id UUID NOT NULL,
  chit_month_id UUID NOT NULL,
  obligation_id UUID NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  installment_amount NUMERIC(14,2) NOT NULL,
  installment_count INTEGER NOT NULL,
  first_due_date DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_plans_chit_status
  ON recovery_plans(chit_id,status);
