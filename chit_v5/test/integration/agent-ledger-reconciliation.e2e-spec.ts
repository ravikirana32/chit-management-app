import {Client} from 'pg';
const dbUrl=process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test';
describe('agent ledger reconciliation',()=>{
 let db:Client;
 beforeAll(async()=>{db=new Client({connectionString:dbUrl});await db.connect()});
 afterAll(async()=>db.end());

 it('each agent month has at most one commission ledger entry',async()=>{
  const r=await db.query(`select chit_month_id,count(*)::int n from ledger_entries where entry_type='AGENT_COMMISSION' group by chit_month_id having count(*)>1`);
  expect(r.rows).toEqual([]);
 });

 it('agent commission amounts are positive credits',async()=>{
  const r=await db.query(`select id from ledger_entries where entry_type='AGENT_COMMISSION' and amount<=0`);
  expect(r.rows).toEqual([]);
 });
});
