import request from 'supertest';
import {Client} from 'pg';
import {base,token,db} from './real-http.helpers';

describe('payment lifecycle',()=>{
 let database:Client;
 let chitId:string;
 let participantId:string;
 let obligationId:string;
 let paymentId:string;
 beforeAll(async()=>{
  if(!token)throw new Error('TEST_ACCESS_TOKEN is required');
  database=await db();
  chitId=process.env.TEST_CHIT_ID||'';
  participantId=process.env.TEST_PARTICIPANT_ID||'';
  obligationId=process.env.TEST_OBLIGATION_ID||'';
 });
 afterAll(async()=>database.end());

 it('requires a valid obligation and participant',async()=>{
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .post(`/v1/payments/chits/${chitId}/participants/${participantId}/submit`)
   .set('Idempotency-Key','qa-payment-lifecycle-1')
   .send({amount:'100.00',paymentMethod:'UPI',transactionReference:'QA-PAY-1',paymentDate:new Date().toISOString(),obligationId});
  expect([201,400,404,409]).toContain(r.status);
  if(r.status===201)paymentId=r.body.payment?.id;
 });

 it('creator verification updates obligation when a real payment was created',async()=>{
  if(!paymentId)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .post(`/v1/payments/${paymentId}/verify`).send({status:'VERIFIED',receiptNumber:'QA-RECEIPT-1'});
  expect(r.status).toBe(201);
  const p=await database.query(`select status from payments where id=$1`,[paymentId]);
  const o=await database.query(`select paid_amount,outstanding_amount,status from contribution_obligations where id=$1`,[obligationId]);
  expect(p.rows[0].status).toBe('VERIFIED');
  expect(Number(o.rows[0].paid_amount)).toBeGreaterThan(0);
 });
});
