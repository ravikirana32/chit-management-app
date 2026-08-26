import {Client} from 'pg';
const dbUrl=process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test';

describe('agent month DB invariants',()=>{
 let db:Client;
 beforeAll(async()=>{db=new Client({connectionString:dbUrl});await db.connect()});
 afterAll(async()=>db.end());

 it('agent month cannot be treated as a draw or auction month',async()=>{
  const r=await db.query(`select cm.id from chit_months cm join chits c on c.id=cm.chit_id where cm.month_type='AGENT_CHIT' and c.chit_type not in ('FIXED_DRAW','AUCTION')`);
  expect(r.rows).toEqual([]);
 });

 it('agent months retain scheduled amounts',async()=>{
  const r=await db.query(`select id from chit_months where month_type='AGENT_CHIT' and (scheduled_amount is null or scheduled_amount<=0)`);
  expect(r.rows).toEqual([]);
 });
});
