import request from 'supertest';
import {base,token} from './real-http.helpers';
describe('v52 multi-agent multi-chit',()=>{
 it('requires auth for agent portfolio',async()=>{
  const r=await request(base).get('/v1/agents/me/dashboard');
  expect([401,403]).toContain(r.status);
 });
 it('requires auth for agent chit list',async()=>{
  const r=await request(base).get('/v1/chits/my/agent-chits');
  expect([401,403]).toContain(r.status);
 });
 it('authenticated portfolio contract responds',async()=>{
  if(!token)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).get('/v1/agents/me/dashboard');
  expect([200,403]).toContain(r.status);
 });
});
