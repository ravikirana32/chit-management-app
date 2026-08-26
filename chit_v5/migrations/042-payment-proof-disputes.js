'use strict';
module.exports={
 async up(q){
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    storage_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
   )`);
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS payment_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    resolution_note TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
   )`);
  await q.sequelize.query(`
   ALTER TABLE payments
   ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP,
   ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
   ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
   ADD COLUMN IF NOT EXISTS rejection_reason TEXT
  `);
 },
 async down(q){
  await q.sequelize.query(`DROP TABLE IF EXISTS payment_disputes; DROP TABLE IF EXISTS payment_proofs`);
 }
};
