import request from 'supertest';

const base=process.env.TEST_API_URL||'http://localhost:3000';

describe('HTTP API contract smoke tests',()=>{
 it('health endpoint is reachable',async()=>{
  const res=await request(base).get('/health');
  expect([200,204]).toContain(res.status);
 });
 it('swagger endpoint is reachable when enabled',async()=>{
  const res=await request(base).get('/docs-json');
  expect([200,404]).toContain(res.status);
 });
 it('unauthenticated chit creation is rejected',async()=>{
  const res=await request(base).post('/v1/chits').send({});
  expect([401,403]).toContain(res.status);
 });
});
