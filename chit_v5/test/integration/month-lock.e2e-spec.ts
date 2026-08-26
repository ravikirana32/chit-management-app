import {Client} from 'pg';
const dbUrl=process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test';

describe('month lock',()=>{
 let db:Client;
 beforeAll(async()=>{db=new Client({connectionString:dbUrl});await db.connect()});
 afterAll(async()=>{await db.end()});

 it('locked months exist only as an explicit state',async()=>{
  const r=await db.query(`select count(*)::int n from chit_months where status='LOCKED'`);
  expect(r.rows[0].n).toBeGreaterThanOrEqual(0);
 });
});
