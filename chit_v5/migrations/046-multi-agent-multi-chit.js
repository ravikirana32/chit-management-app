'use strict';
module.exports={
 async up(q){
  await q.sequelize.query(`
   CREATE TABLE IF NOT EXISTS chit_agent_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chit_id UUID NOT NULL REFERENCES chits(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_view_members BOOLEAN NOT NULL DEFAULT true,
    can_collect_cash BOOLEAN NOT NULL DEFAULT true,
    can_verify_payments BOOLEAN NOT NULL DEFAULT true,
    can_manage_chat BOOLEAN NOT NULL DEFAULT true,
    can_run_draw BOOLEAN NOT NULL DEFAULT false,
    can_run_auction BOOLEAN NOT NULL DEFAULT false,
    can_manage_chit BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(chit_id,agent_id)
   )`);
  await q.sequelize.query(`
   CREATE INDEX IF NOT EXISTS idx_chit_agent_assignments_agent
   ON chit_agent_assignments(agent_id,active)
  `);
  await q.sequelize.query(`
   CREATE INDEX IF NOT EXISTS idx_chit_agent_assignments_chit
   ON chit_agent_assignments(chit_id,active)
  `);
 }
};
