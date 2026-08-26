'use strict';
module.exports={
 async up(q,S){
  try{await q.addColumn('ledger_entries','idempotency_key',{type:S.STRING(140),allowNull:true});}catch{}
  try{await q.addIndex('ledger_entries',['chit_month_id','entry_type'],{unique:true,name:'uq_agent_commission_month',where:{entry_type:'AGENT_COMMISSION'}});}catch{}
 },
 async down(q,S){
  try{await q.removeIndex('ledger_entries','uq_agent_commission_month')}catch{}
  try{await q.removeColumn('ledger_entries','idempotency_key')}catch{}
 }
};
