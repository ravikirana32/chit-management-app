'use strict';
module.exports={
 async up(q,S){
  const add=async(t,c,d)=>{try{await q.addColumn(t,c,d)}catch{}};
  await add('payments','idempotency_key',{type:S.STRING(120),allowNull:true});
  await add('payouts','idempotency_key',{type:S.STRING(120),allowNull:true});
  await add('draws','idempotency_key',{type:S.STRING(120),allowNull:true});
  await add('auctions','finalization_key',{type:S.STRING(120),allowNull:true});
  try{await q.addIndex('payments',['idempotency_key'],{unique:true,name:'uq_payments_idempotency'});}catch{}
  try{await q.addIndex('payouts',['idempotency_key'],{unique:true,name:'uq_payouts_idempotency'});}catch{}
  try{await q.addIndex('draws',['idempotency_key'],{unique:true,name:'uq_draws_idempotency'});}catch{}
  try{await q.addIndex('auctions',['finalization_key'],{unique:true,name:'uq_auctions_finalization_key'});}catch{}
 },
 async down(q,S){
  for(const [t,c] of [['auctions','finalization_key'],['draws','idempotency_key'],['payouts','idempotency_key'],['payments','idempotency_key']]){
   try{await q.removeColumn(t,c)}catch{}
  }
 }
};
