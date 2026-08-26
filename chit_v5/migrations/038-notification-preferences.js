'use strict';
module.exports={
 async up(q,S){
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_reminders BOOLEAN NOT NULL DEFAULT true,
    auction_alerts BOOLEAN NOT NULL DEFAULT true,
    winner_alerts BOOLEAN NOT NULL DEFAULT true,
    payout_alerts BOOLEAN NOT NULL DEFAULT true,
    overdue_alerts BOOLEAN NOT NULL DEFAULT true,
    member_updates BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    quiet_start VARCHAR(5),
    quiet_end VARCHAR(5),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
   )`);
 },
 async down(q){await q.sequelize.query(`DROP TABLE IF EXISTS notification_preferences`)}
};
