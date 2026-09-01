'use strict';

module.exports = {
  async up(q, S) {
    await q.sequelize.query(`
      CREATE TABLE IF NOT EXISTS otp_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        normalized_mobile VARCHAR(25) NOT NULL,
        otp_hash VARCHAR(128) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        consumed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_otp_challenges_mobile_created
        ON otp_challenges(normalized_mobile, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_otp_challenges_expiry
        ON otp_challenges(expires_at);

      CREATE TABLE IF NOT EXISTS refresh_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        rotated_to_id UUID,
        user_agent VARCHAR(500),
        ip_address VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_active
        ON refresh_sessions(user_id, revoked_at, expires_at);
    `);
  },
  async down(q) {
    await q.sequelize.query(`DROP TABLE IF EXISTS refresh_sessions; DROP TABLE IF EXISTS otp_challenges;`);
  },
};
