'use strict';
module.exports={
 async up(q,S){
  const add=async(t,c,d)=>{try{await q.addColumn(t,c,d)}catch{}};
  await add('chits','total_chit_amount',{type:S.DECIMAL(14,2),allowNull:true});
  await add('chits','accumulated_savings_amount',{type:S.DECIMAL(14,2),allowNull:false,defaultValue:0});
  await add('chits','completed_months',{type:S.INTEGER,allowNull:false,defaultValue:0});
  await add('auctions','auction_type',{type:S.STRING(30),allowNull:false,defaultValue:'MONTHLY'});
  await add('auctions','funding_amount',{type:S.DECIMAL(14,2),allowNull:true});
  await add('auctions','finalized_at',{type:S.DATE,allowNull:true});
  await add('auctions','completed_at',{type:S.DATE,allowNull:true});
  await add('chit_months','locked_at',{type:S.DATE,allowNull:true});
  await add('chit_months','locked_by',{type:S.UUID,allowNull:true,references:{model:'users',key:'id'},onDelete:'SET NULL'});
  await q.sequelize.query(`UPDATE chits c SET total_chit_amount=COALESCE(c.total_chit_amount,(SELECT cm.scheduled_amount FROM chit_months cm WHERE cm.chit_id=c.id ORDER BY cm.month_number LIMIT 1)*c.total_members) WHERE c.total_chit_amount IS NULL`);
  await q.sequelize.query(`UPDATE chits c SET accumulated_savings_amount=COALESCE((SELECT SUM(a.discount_amount) FROM auctions a WHERE a.chit_id=c.id AND a.auction_type='MONTHLY' AND a.status='COMPLETED'),0),completed_months=COALESCE((SELECT COUNT(*) FROM chit_months cm WHERE cm.chit_id=c.id AND cm.status='COMPLETED'),0)`);
  await q.sequelize.query(`UPDATE auctions a SET auction_type='MONTHLY',funding_amount=COALESCE(a.funding_amount,m.scheduled_amount) FROM chit_months m WHERE a.chit_month_id=m.id`);
  await q.sequelize.query(`CREATE TABLE IF NOT EXISTS chit_savings_transactions(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chit_id UUID NOT NULL REFERENCES chits(id) ON DELETE CASCADE,
    auction_id UUID REFERENCES auctions(id) ON DELETE SET NULL,
    chit_month_id UUID REFERENCES chit_months(id) ON DELETE SET NULL,
    transaction_type VARCHAR(40) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    balance_after NUMERIC(14,2) NOT NULL,
    agent_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);
  await q.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_chit_savings_chit_created ON chit_savings_transactions(chit_id,created_at)`);
  await q.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_chit_savings_auction ON chit_savings_transactions(auction_id)`);
  await q.sequelize.query(`INSERT INTO chit_savings_transactions(id,chit_id,transaction_type,amount,balance_after,notes,created_at,updated_at)
    SELECT gen_random_uuid(),c.id,'LEGACY_AUCTION_DISCOUNTS',c.accumulated_savings_amount,c.accumulated_savings_amount,'Opening balance reconstructed from completed historical monthly auctions',NOW(),NOW()
    FROM chits c WHERE c.accumulated_savings_amount>0 AND NOT EXISTS(SELECT 1 FROM chit_savings_transactions t WHERE t.chit_id=c.id)`);
 },
 async down(q){await q.sequelize.query(`DROP TABLE IF EXISTS chit_savings_transactions`);for(const [t,c] of [['chit_months','locked_by'],['chit_months','locked_at'],['auctions','completed_at'],['auctions','finalized_at'],['auctions','funding_amount'],['auctions','auction_type'],['chits','completed_months'],['chits','accumulated_savings_amount'],['chits','total_chit_amount']]){try{await q.removeColumn(t,c)}catch{}}}
};
