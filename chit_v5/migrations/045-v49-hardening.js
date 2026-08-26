'use strict';
module.exports={
 async up(q){
  await q.sequelize.query(`
   ALTER TABLE chit_chat_messages
   ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(100)
  `);
  await q.sequelize.query(`
   CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_message_client_id
   ON chit_chat_messages(chit_id,sender_id,client_message_id)
   WHERE client_message_id IS NOT NULL
  `);
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chat_user_presence (
    chit_id UUID NOT NULL REFERENCES chits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY(chit_id,user_id)
   )`);
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS device_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    token VARCHAR(500) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id,platform,token)
   )`);
 },
 async down(q){
  await q.sequelize.query(`DROP TABLE IF EXISTS device_push_tokens; DROP TABLE IF EXISTS chat_user_presence`);
 }
};
