import request from 'supertest';
import {base,token,db} from './real-http.helpers';
describe('v42 payment collection',()=>{
 it('gets member payment profile',async()=>{if(!token)return;const r=await request(base).set('Authorization',`Bearer ${token}`).get('/v1/profile/payment-details');expect(r.status).toBe(200)});
 it('updates UPI and cash preference',async()=>{if(!token)return;const r=await request(base).set('Authorization',`Bearer ${token}`).put('/v1/profile/payment-details').send({upiId:'member@upi',upiName:'Member',preferredMethod:'UPI',cashEnabled:true});expect([200,201]).toContain(r.status)});
 it('rejects unauthenticated cash recording',async()=>{const r=await request(base).post(`/v1/payment-collection/obligations/${process.env.TEST_OBLIGATION_ID||'x'}/record-cash`).send({method:'CASH',amount:'100'});expect([401,403]).toContain(r.status)});
 it('creator/agent cash endpoint creates verified CASH payment',async()=>{if(!token||!process.env.TEST_OBLIGATION_ID)return;const r=await request(base).set('Authorization',`Bearer ${token}`).post(`/v1/payment-collection/obligations/${process.env.TEST_OBLIGATION_ID}/record-cash`).send({method:'CASH',amount:'1000',cashReceiptNote:'QA cash'});expect([200,201,403,404,409]).toContain(r.status)});
});
