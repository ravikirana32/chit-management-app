import request from 'supertest';
import {base} from './real-http.helpers';

describe('IDOR and ownership security',()=>{
 const creator=process.env.TEST_ACCESS_TOKEN||'';
 const member=process.env.TEST_MEMBER_ACCESS_TOKEN||'';
 const chit=process.env.TEST_CHIT_ID||'';
 const otherChit=process.env.TEST_OTHER_CHIT_ID||'';
 const participant=process.env.TEST_PARTICIPANT_ID||'';
 const otherParticipant=process.env.TEST_OTHER_PARTICIPANT_ID||'';

 it('creator can access own chit',async()=>{
  if(!creator||!chit)return;
  const r=await request(base).set('Authorization',`Bearer ${creator}`).get(`/v1/chits/${chit}`);
  expect(r.status).toBe(200);
 });
 it('member cannot publish a chit',async()=>{
  if(!member||!chit)return;
  const r=await request(base).set('Authorization',`Bearer ${member}`).post(`/v1/chits/${chit}/publish`).send({});
  expect([401,403,409]).toContain(r.status);
 });
 it('member cannot access unrelated chit',async()=>{
  if(!member||!otherChit)return;
  const r=await request(base).set('Authorization',`Bearer ${member}`).get(`/v1/chits/${otherChit}`);
  expect([403,404,409]).toContain(r.status);
 });
 it('member cannot submit payment for another member',async()=>{
  if(!member||!chit||!otherParticipant)return;
  const r=await request(base).set('Authorization',`Bearer ${member}`)
   .post(`/v1/payments/chits/${chit}/participants/${otherParticipant}/submit`)
   .set('Idempotency-Key','idor-payment-test')
   .send({amount:'1.00',paymentMethod:'UPI',transactionReference:'IDOR-1',paymentDate:new Date().toISOString()});
  expect([400,403,404,409]).toContain(r.status);
 });
 it('creator/member tokens are not interchangeable',async()=>{
  if(!creator||!member||!participant)return;
  const r=await request(base).set('Authorization',`Bearer ${member}`).get(`/v1/chits/${chit}/participants`);
  expect([403,409]).toContain(r.status);
 });
});
