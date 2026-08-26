'use strict';
module.exports={
 async up(q,S){
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chit_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chit_id UUID REFERENCES chits(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    source_type VARCHAR(30) NOT NULL DEFAULT 'HISTORICAL_IMPORT',
    current_month_number INTEGER,
    imported_by UUID REFERENCES users(id),
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP
   )`);
  await q.sequelize.query(`
   ALTER TABLE payments
   ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES chit_import_batches(id),
   ADD COLUMN IF NOT EXISTS original_reference VARCHAR(255),
   ADD COLUMN IF NOT EXISTS historical_notes TEXT
  `);
  await q.sequelize.query(`
   ALTER TABLE chit_months
   ADD COLUMN IF NOT EXISTS historical_source VARCHAR(30) DEFAULT 'LIVE',
   ADD COLUMN IF NOT EXISTS historical_winner_name VARCHAR(255),
   ADD COLUMN IF NOT EXISTS historical_winner_user_id UUID,
   ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES chit_import_batches(id)
  `);
 },
 async down(q){await q.sequelize.query(`DROP TABLE IF EXISTS chit_import_batches`)}
};
