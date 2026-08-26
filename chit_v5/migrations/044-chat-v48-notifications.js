'use strict';
module.exports={
 async up(q){
  await q.sequelize.query(`
   ALTER TABLE chit_chat_messages
   ADD COLUMN IF NOT EXISTS mention_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
   ADD COLUMN IF NOT EXISTS attachment_count INTEGER NOT NULL DEFAULT 0
  `);
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chit_chat_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chit_chat_messages(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    resolution_note TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
   )`);
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chit_id UUID REFERENCES chits(id) ON DELETE CASCADE,
    type VARCHAR(60) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
   )`);
  await q.sequelize.query(`
   CREATE INDEX IF NOT EXISTS idx_notification_events_user_created
   ON notification_events(user_id,created_at DESC)
  `);
 },
 async down(q){
  await q.sequelize.query(`DROP TABLE IF EXISTS notification_events; DROP TABLE IF EXISTS chit_chat_reports`);
 }
};
