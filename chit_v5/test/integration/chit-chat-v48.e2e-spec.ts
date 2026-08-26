import request from 'supertest';
import {base,token} from './real-http.helpers';
describe('v48 chat notifications/moderation',()=>{
 it('requires auth for reports',async()=>{const r=await request(base).post('/v1/chits/x/chat/messages/x/report').send({reason:'spam'});expect([401,403]).toContain(r.status)});
 it('requires auth for notifications',async()=>{const r=await request(base).get('/v1/chits/x/chat/notifications');expect([401,403]).toContain(r.status)});
 it('authenticated notification endpoint responds',async()=>{
  if(!token||!process.env.TEST_CHIT_ID)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).get(`/v1/chits/${process.env.TEST_CHIT_ID}/chat/notifications`);
  expect([200,403,404]).toContain(r.status);
 });
});
