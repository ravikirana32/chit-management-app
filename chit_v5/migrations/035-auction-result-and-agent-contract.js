'use strict';
module.exports={
 async up(q,S){
  const add=async(table,column,definition)=>{try{await q.addColumn(table,column,definition)}catch{}};
  await add('auctions','winner_participant_id',{type:S.UUID,allowNull:true,references:{model:'chit_participants',key:'id'},onDelete:'SET NULL'});
  await add('auctions','winning_bid_amount',{type:S.DECIMAL(14,2),allowNull:true});
  await add('auctions','discount_amount',{type:S.DECIMAL(14,2),allowNull:true});
  await add('auctions','payout_amount',{type:S.DECIMAL(14,2),allowNull:true});
  await add('chit_months','agent_id',{type:S.UUID,allowNull:true,references:{model:'agents',key:'id'},onDelete:'SET NULL'});
 },
 async down(q,S){
  for(const [t,c] of [['auctions','payout_amount'],['auctions','discount_amount'],['auctions','winning_bid_amount'],['auctions','winner_participant_id']]){
   try{await q.removeColumn(t,c)}catch{}
  }
 }
};
