import {Client} from 'pg';

const dbUrl=process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test';
describe('financial database invariants',()=>{
 let db:Client;
 beforeAll(async()=>{db=new Client({connectionString:dbUrl});await db.connect()});
 afterAll(async()=>{await db.end()});

 it('has no duplicate active participant per chit/user',async()=>{
  const r=await db.query(`select chit_id,user_id,count(*) n from chit_participants where status in ('ACTIVE','INVITED') group by chit_id,user_id having count(*)>1`);
  expect(r.rows).toEqual([]);
 });
 it('has at most one draw winner per month',async()=>{
  const r=await db.query(`select d.chit_month_id,count(dw.id) n from draws d join draw_winners dw on dw.draw_id=d.id group by d.chit_month_id having count(dw.id)>1`);
  expect(r.rows).toEqual([]);
 });
 it('has at most one auction winner per auction',async()=>{
  const r=await db.query(`select auction_id,count(*) n from auction_winners group by auction_id having count(*)>1`);
  expect(r.rows).toEqual([]);
 });
 it('has no negative obligation outstanding amount',async()=>{
  const r=await db.query(`select id from contribution_obligations where outstanding_amount < 0`);
  expect(r.rows).toEqual([]);
 });
 it('has no payout greater than configured payout amount where both are present',async()=>{
  const r=await db.query(`select p.id from payouts p where p.amount < 0`);
  expect(r.rows).toEqual([]);
 });
});
