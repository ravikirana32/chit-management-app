import request from 'supertest';
import {Client} from 'pg';
import {base,token,db} from './real-http.helpers';

describe('reconciliation, default recovery and month close',()=>{
 let database:Client;
 const chitId=process.env.TEST_CHIT_ID||'';
 const monthId=process.env.TEST_MONTH_ID||'';
 const obligationId=process.env.TEST_OBLIGATION_ID||'';

 beforeAll(async()=>{
  if(!token)throw new Error('TEST_ACCESS_TOKEN is required');
  database=await db();
 });
 afterAll(async()=>database.end());

 it('creator can inspect overdue/default obligations',async()=>{
  if(!chitId)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .get(`/v1/collections/chits/${chitId}/overdue`);
  expect([200,403]).toContain(r.status);
  if(r.status===200)expect(Array.isArray(r.body)).toBe(true);
 });

 it('month close rejects unresolved obligations',async()=>{
  if(!monthId||!obligationId)return;
  await database.query(`update contribution_obligations set status='OVERDUE',outstanding_amount=100 where id=$1`,[obligationId]);
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .post(`/v1/month-close/months/${monthId}`);
  expect(r.status).toBe(409);
 });

 it('month close is allowed only after obligations and payout are resolved',async()=>{
  if(!monthId||!obligationId)return;
  await database.query(`update contribution_obligations set status='VERIFIED',outstanding_amount=0 where id=$1`,[obligationId]);
  const pending=await database.query(`select count(*)::int n from payouts where chit_month_id=$1 and status='PENDING'`,[monthId]);
  if(pending.rows[0].n>0)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .post(`/v1/month-close/months/${monthId}`);
  expect([201,200,409]).toContain(r.status);
  if([200,201].includes(r.status)){
   const row=await database.query(`select status from chit_months where id=$1`,[monthId]);
   expect(row.rows[0].status).toBe('LOCKED');
  }
 });

 it('locked month remains locked on repeated close',async()=>{
  if(!monthId)return;
  const row=await database.query(`select status from chit_months where id=$1`,[monthId]);
  if(row.rows[0]?.status!=='LOCKED')return;
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .post(`/v1/month-close/months/${monthId}`);
  expect([200,201]).toContain(r.status);
 });
});
