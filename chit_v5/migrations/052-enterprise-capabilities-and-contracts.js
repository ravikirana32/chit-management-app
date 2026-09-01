'use strict';

/**
 * V55 enterprise capability alignment.
 *
 * Explicit capabilities are added so viewing/inviting members and viewing/
 * settling payouts are no longer coupled to unrelated permissions.
 *
 * Existing assignments are backfilled from the current V52/V53 model and a
 * compatibility trigger preserves behavior for legacy INSERT statements that
 * do not yet populate the new columns.
 */
module.exports = {
  async up(q) {
    await q.sequelize.query(`
      ALTER TABLE chit_agent_assignments
        ADD COLUMN IF NOT EXISTS can_invite_members BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS can_view_payout BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS can_settle_payout BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS can_reopen_auction BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS can_open_additional_auction BOOLEAN NOT NULL DEFAULT false
    `);

    await q.sequelize.query(`
      UPDATE chit_agent_assignments
      SET can_invite_members = can_view_members,
          can_view_payout = (can_manage_chit OR can_collect_cash),
          can_settle_payout = (can_manage_chit OR can_collect_cash),
          can_reopen_auction = can_run_auction,
          can_open_additional_auction = can_run_auction
    `);

    await q.sequelize.query(`
      CREATE OR REPLACE FUNCTION sync_chit_agent_enterprise_capabilities()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.can_invite_members IS DISTINCT FROM true THEN
          NEW.can_invite_members := COALESCE(NEW.can_view_members, false);
        END IF;
        IF NEW.can_view_payout IS DISTINCT FROM true THEN
          NEW.can_view_payout := COALESCE(NEW.can_manage_chit OR NEW.can_collect_cash, false);
        END IF;
        IF NEW.can_settle_payout IS DISTINCT FROM true THEN
          NEW.can_settle_payout := COALESCE(NEW.can_manage_chit OR NEW.can_collect_cash, false);
        END IF;
        IF NEW.can_reopen_auction IS DISTINCT FROM true THEN
          NEW.can_reopen_auction := COALESCE(NEW.can_run_auction, false);
        END IF;
        IF NEW.can_open_additional_auction IS DISTINCT FROM true THEN
          NEW.can_open_additional_auction := COALESCE(NEW.can_run_auction, false);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await q.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_sync_chit_agent_enterprise_capabilities
      ON chit_agent_assignments
    `);

    await q.sequelize.query(`
      CREATE TRIGGER trg_sync_chit_agent_enterprise_capabilities
      BEFORE INSERT OR UPDATE ON chit_agent_assignments
      FOR EACH ROW EXECUTE FUNCTION sync_chit_agent_enterprise_capabilities()
    `);
  },

  async down(q) {
    await q.sequelize.query(`DROP TRIGGER IF EXISTS trg_sync_chit_agent_enterprise_capabilities ON chit_agent_assignments`);
    await q.sequelize.query(`DROP FUNCTION IF EXISTS sync_chit_agent_enterprise_capabilities()`);
    await q.sequelize.query(`
      ALTER TABLE chit_agent_assignments
        DROP COLUMN IF EXISTS can_invite_members,
        DROP COLUMN IF EXISTS can_view_payout,
        DROP COLUMN IF EXISTS can_settle_payout,
        DROP COLUMN IF EXISTS can_reopen_auction,
        DROP COLUMN IF EXISTS can_open_additional_auction
    `);
  },
};
