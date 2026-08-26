import request from 'supertest';
import {base} from './real-http.helpers';

describe('financial authorization matrix',()=>{
 const creator=process.env.TEST_ACCESS_TOKEN||'';
 const member=process.env.TEST_MEMBER_ACCESS_TOKEN||'';
 const chit=process.env.TEST_CHIT_ID||'';
 const payment=process.env.TEST_PAYMENT_ID||'';
 const payout=process.env.TEST_PAYOUT_ID||'';
 const auction=process.env.TEST_AUCTION_ID||'';

 it('only creator verifies payment',async()=>{
  if(!member||!payment)return;
  const r=await request(base).set('Authorization',`Bearer ${member}`).post(`/v1/payments/${payment}/verify`).send({status:'VERIFIED'});
  expect([401,403,404,409]).toContain(r.status);
 });
 it('only creator can settle payout',async()=>{
  if(!member||!payout)return;
  const r=await request(base).set('Authorization',`Bearer ${member}`).post(`/v1/payouts/${payout}/settle`).send({});
  expect([401,403,404,409]).toContain(r.status);
 });
 it('unrelated member cannot finalize auction',async()=>{
  if(!member||!auction)return;
  const r=await request(base).set('Authorization',`Bearer ${member}`).post(`/v1/auctions/${auction}/finalize`).send({});
  expect([401,403,404,409]).toContain(r.status);
 });
 it('creator can read own reconciliation',async()=>{
  if(!creator||!chit)return;
  const r=await request(base).set('Authorization',`Bearer ${creator}`).get(`/v1/reconciliation/chits/${chit}`);
  expect(r.status).toBe(200);
 });
});
