CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_id UUID NOT NULL,
  chit_month_id UUID NULL,
  chit_participant_id UUID NULL,
  entry_type VARCHAR(80) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(80) NULL,
  reference_id UUID NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_chit_participant
  ON ledger_entries(chit_id,chit_participant_id,created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_payout_reference
  ON ledger_entries(reference_type,reference_id)
  WHERE reference_type='PAYOUT';
