'use strict';
module.exports={
 async up(q){
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chit_import_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL REFERENCES chit_import_batches(id) ON DELETE CASCADE,
    chit_id UUID NOT NULL REFERENCES chits(id) ON DELETE CASCADE,
    month_number INTEGER NOT NULL,
    expected_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    imported_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    difference_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'UNRESOLVED',
    resolution_type VARCHAR(40),
    resolution_note TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    UNIQUE(import_batch_id,month_number)
   )`);
  await q.sequelize.query(`
   ALTER TABLE chit_import_batches
   ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP,
   ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
   ADD COLUMN IF NOT EXISTS applied_by UUID REFERENCES users(id)
  `);
 },
 async down(q){await q.sequelize.query(`DROP TABLE IF EXISTS chit_import_reconciliation`)}
};
