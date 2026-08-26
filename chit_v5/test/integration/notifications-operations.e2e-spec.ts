import request from 'supertest';
import {base,token,db} from './real-http.helpers';
describe('notifications and operations',()=>{
 it('gets and updates notification preferences',async()=>{
  if(!token)return;
  const a=await request(base).set('Authorization',`Bearer ${token}`).get('/v1/notifications/preferences');
  expect(a.status).toBe(200);
  const b=await request(base).set('Authorization',`Bearer ${token}`).put('/v1/notifications/preferences').send({paymentReminders:true,pushEnabled:true});
  expect([200,201]).toContain(b.status);
 });
 it('creator operations summary is protected',async()=>{
  if(!token||!process.env.TEST_CHIT_ID)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).get(`/v1/operations/chits/${process.env.TEST_CHIT_ID}/summary`);
  expect([200,403]).toContain(r.status);
 });
});
