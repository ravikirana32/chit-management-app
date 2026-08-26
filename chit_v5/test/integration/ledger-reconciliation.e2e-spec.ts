import {Client} from 'pg';
const dbUrl=process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test';

describe('ledger reconciliation',()=>{
 let db:Client;
 beforeAll(async()=>{db=new Client({connectionString:dbUrl});await db.connect()});
 afterAll(async()=>{await db.end()});

 it('ledger has signed amounts',async()=>{
  const r=await db.query(`select count(*)::int n from ledger_entries where amount is null`);
  expect(r.rows[0].n).toBe(0);
 });
 it('verified payments are represented in obligations',async()=>{
  const r=await db.query(`
   select p.id
   from payments p left join contribution_obligations o on o.id=p.obligation_id
   where p.status='VERIFIED' and o.id is null`);
  expect(r.rows).toEqual([]);
 });
});
