'use strict';
module.exports={
 async up(q){
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chit_chat_settings (
    chit_id UUID PRIMARY KEY REFERENCES chits(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    members_can_post BOOLEAN NOT NULL DEFAULT true,
    members_can_reply BOOLEAN NOT NULL DEFAULT true,
    attachments_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
   )`);
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chit_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chit_id UUID NOT NULL REFERENCES chits(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    reply_to_message_id UUID REFERENCES chit_chat_messages(id),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP
   )`);
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chit_chat_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chit_chat_messages(id) ON DELETE CASCADE,
    storage_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
   )`);
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chit_chat_reads (
    chit_id UUID NOT NULL REFERENCES chits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY(chit_id,user_id)
   )`);
 },
 async down(q){
  await q.sequelize.query(`DROP TABLE IF EXISTS chit_chat_reads; DROP TABLE IF EXISTS chit_chat_attachments; DROP TABLE IF EXISTS chit_chat_messages; DROP TABLE IF EXISTS chit_chat_settings`);
 }
};
