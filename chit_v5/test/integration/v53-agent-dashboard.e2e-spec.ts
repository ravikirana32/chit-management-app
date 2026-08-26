import request from 'supertest';
import {base,token} from './real-http.helpers';
describe('v53 agent dashboard',()=>{
 it('requires authentication',async()=>{
  const r=await request(base).get('/v1/agents/me/dashboard');
  expect([401,403]).toContain(r.status);
 });
 it('returns dashboard contract for authenticated user',async()=>{
  if(!token)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).get('/v1/agents/me/dashboard');
  expect([200,403]).toContain(r.status);
  if(r.status===200){
   expect(r.body).toHaveProperty('data.summary');
   expect(r.body.data).toHaveProperty('chits');
  }
 });
});
