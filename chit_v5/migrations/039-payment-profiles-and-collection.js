'use strict';
module.exports={
 async up(q,S){
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS member_payment_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upi_id VARCHAR(255),
    upi_name VARCHAR(255),
    preferred_method VARCHAR(30) NOT NULL DEFAULT 'UPI',
    cash_enabled BOOLEAN NOT NULL DEFAULT true,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
   )`);
  await q.sequelize.query(`
   ALTER TABLE payments
   ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30),
   ADD COLUMN IF NOT EXISTS recorded_by UUID,
   ADD COLUMN IF NOT EXISTS recorded_by_role VARCHAR(30),
   ADD COLUMN IF NOT EXISTS historical_source VARCHAR(30) DEFAULT 'LIVE',
   ADD COLUMN IF NOT EXISTS cash_receipt_note TEXT,
   ADD COLUMN IF NOT EXISTS winner_upi_snapshot VARCHAR(255),
   ADD COLUMN IF NOT EXISTS winner_upi_name_snapshot VARCHAR(255)
  `);
 },
 async down(q){
  await q.sequelize.query(`DROP TABLE IF EXISTS member_payment_profiles`);
 }
};
