'use strict';

/**
 * Fix the V52 agent-assignment foreign key.
 *
 * Canonical identity model:
 *
 *   users.id
 *      ↓
 *   agents.user_id
 *      ↓
 *   agents.id
 *      ↓
 *   chit_agent_assignments.agent_id
 *
 * The existing database constraint incorrectly points
 * chit_agent_assignments.agent_id -> users.id, while the application
 * correctly stores agents.id in that column.
 *
 * This migration changes the FK to agents(id).
 *
 * IMPORTANT:
 * Existing rows are checked before the FK is changed. If an orphaned
 * assignment exists, the migration fails instead of silently deleting
 * or changing financial/authorization data.
 */
module.exports = {
  async up(q) {
    const [orphans] = await q.sequelize.query(`
      SELECT ca.id, ca.chit_id, ca.agent_id
      FROM chit_agent_assignments ca
      LEFT JOIN agents a ON a.id = ca.agent_id
      WHERE a.id IS NULL
    `);

    if (orphans.length) {
      throw new Error(
        `Cannot repair chit_agent_assignments.agent_id FK: ` +
        `${orphans.length} orphaned assignment(s) reference a non-existent agents.id. ` +
        `Resolve those rows before running this migration.`,
      );
    }

    await q.sequelize.query(`
      ALTER TABLE chit_agent_assignments
      DROP CONSTRAINT IF EXISTS chit_agent_assignments_agent_id_fkey
    `);

    await q.sequelize.query(`
      ALTER TABLE chit_agent_assignments
      ADD CONSTRAINT chit_agent_assignments_agent_id_fkey
      FOREIGN KEY (agent_id)
      REFERENCES agents(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
    `);

    await q.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chit_agent_assignments_agent_active
      ON chit_agent_assignments(agent_id, active)
    `);
  },

  async down(q) {
    await q.sequelize.query(`
      DROP INDEX IF EXISTS idx_chit_agent_assignments_agent_active
    `);

    await q.sequelize.query(`
      ALTER TABLE chit_agent_assignments
      DROP CONSTRAINT IF EXISTS chit_agent_assignments_agent_id_fkey
    `);

    await q.sequelize.query(`
      ALTER TABLE chit_agent_assignments
      ADD CONSTRAINT chit_agent_assignments_agent_id_fkey
      FOREIGN KEY (agent_id)
      REFERENCES users(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
    `);
  },
};
