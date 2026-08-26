import {Client} from 'pg';
const url=process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test';

describe('v41 financial release invariants',()=>{
 let db:Client;
 beforeAll(async()=>{db=new Client({connectionString:url});await db.connect()});
 afterAll(async()=>db.end());

 it('has no negative obligation outstanding balances',async()=>{
  const r=await db.query(`select id from contribution_obligations where outstanding_amount<0`);
  expect(r.rows).toEqual([]);
 });
 it('has no duplicate participant sequence within a chit',async()=>{
  const r=await db.query(`select chit_id,participant_sequence,count(*)::int n from chit_participants group by chit_id,participant_sequence having count(*)>1`);
  expect(r.rows).toEqual([]);
 });
 it('has no duplicate draw winners',async()=>{
  const r=await db.query(`select draw_id,count(*)::int n from draw_winners group by draw_id having count(*)>1`);
  expect(r.rows).toEqual([]);
 });
 it('has no duplicate auction winners',async()=>{
  const r=await db.query(`select auction_id,count(*)::int n from auction_winners group by auction_id having count(*)>1`);
  expect(r.rows).toEqual([]);
 });
 it('has no duplicate payout ledger references',async()=>{
  const r=await db.query(`select reference_id,count(*)::int n from ledger_entries where reference_type='PAYOUT' group by reference_id having count(*)>1`);
  expect(r.rows).toEqual([]);
 });
 it('has no duplicate agent commission entries',async()=>{
  const r=await db.query(`select chit_month_id,count(*)::int n from ledger_entries where entry_type='AGENT_COMMISSION' group by chit_month_id having count(*)>1`);
  expect(r.rows).toEqual([]);
 });
});
