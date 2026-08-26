import request from 'supertest';
import {Client} from 'pg';
import {base,token,db} from './real-http.helpers';

describe('same-key concurrent payment',()=>{
 let database:Client;
 beforeAll(async()=>{if(!token)throw new Error('TEST_ACCESS_TOKEN is required');database=await db()});
 afterAll(async()=>database.end());

 it('does not create two payments for one idempotency key',async()=>{
  const chit=process.env.TEST_CHIT_ID||'';
  const participant=process.env.TEST_PARTICIPANT_ID||'';
  const obligation=process.env.TEST_OBLIGATION_ID||'';
  if(!chit||!participant||!obligation)return;
  const key=`qa-concurrent-payment-${Date.now()}`;
  const body={amount:'10.00',paymentMethod:'UPI',transactionReference:key,paymentDate:new Date().toISOString(),obligationId:obligation};
  const responses=await Promise.all([1,2,3,4,5].map(()=>request(base).set('Authorization',`Bearer ${token}`).set('Idempotency-Key',key).post(`/v1/payments/chits/${chit}/participants/${participant}/submit`).send(body)));
  const successful=responses.filter(r=>r.status===201);
  expect(successful.length).toBeLessThanOrEqual(1);
  const rows=await database.query(`select count(*)::int n from payments where transaction_reference=$1`,[key]);
  expect(rows.rows[0].n).toBeLessThanOrEqual(1);
 });
});
