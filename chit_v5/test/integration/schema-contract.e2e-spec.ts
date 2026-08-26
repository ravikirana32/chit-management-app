import {Client} from 'pg';

const required:Record<string,string[]>={
 chits:['creator_id','chit_type','total_members','total_months','start_date','due_day','collection_grace_days','agent_commission_mode'],
 chit_months:['month_number','scheduled_amount','month_type','agent_id'],
 chit_participants:['chit_id','user_id','participant_sequence'],
 contribution_obligations:['due_amount','paid_amount','outstanding_amount','status'],
 payments:['obligation_id','amount','status'],
 draws:['chit_month_id','status'],
 draw_winners:['draw_id','chit_participant_id'],
 auctions:['chit_month_id','status','starts_at','ends_at','winner_participant_id','winning_bid_amount','discount_amount','payout_amount'],
 bids:['auction_id','chit_participant_id','amount','status','submitted_at'],
 auction_winners:['auction_id','chit_participant_id','winning_bid_id','winning_bid_amount'],
 payouts:['chit_month_id','recipient_user_id','amount','status'],
 agent_chit_settlements:['chit_month_id','agent_id','expected_amount','settled_amount','status'],
 ledger_entries:['chit_id','chit_month_id','chit_participant_id','entry_type','amount'],
 audit_logs:['actor_user_id','chit_id','action','entity_type','entity_id'],
 user_payment_profiles:['user_id','upi_id','cash_accepted']
};

describe('database schema contract',()=>{
 let client:Client;
 beforeAll(async()=>{
  client=new Client({connectionString:process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test'});
  await client.connect();
 });
 afterAll(async()=>{await client.end()});
 it('contains all columns required by application services',async()=>{
  for(const [table,columns] of Object.entries(required)){
   const r=await client.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name=$1`,
    [table]);
   const found=new Set(r.rows.map((x:any)=>x.column_name));
   for(const column of columns) expect(found.has(column)).toBe(true);
  }
 });
});
