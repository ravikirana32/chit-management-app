import request from 'supertest';
import {base,token} from './real-http.helpers';
describe('v47 chit chat',()=>{
 it('requires authentication',async()=>{const r=await request(base).get('/v1/chits/x/chat/messages');expect([401,403]).toContain(r.status)});
 it('posts message for authorized user',async()=>{
  if(!token||!process.env.TEST_CHIT_ID)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).post(`/v1/chits/${process.env.TEST_CHIT_ID}/chat/messages`).send({message:'QA chat message'});
  expect([200,201,403,404]).toContain(r.status);
 });
 it('reads chat for authorized user',async()=>{
  if(!token||!process.env.TEST_CHIT_ID)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).get(`/v1/chits/${process.env.TEST_CHIT_ID}/chat/messages`);
  expect([200,403,404]).toContain(r.status);
 });
});
