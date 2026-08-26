import request from 'supertest';
import {base} from './real-http.helpers';

describe('security regression',()=>{
 it('rejects unauthenticated final reconciliation',async()=>{
  const r=await request(base).get(`/v1/reconciliation/chits/${process.env.TEST_CHIT_ID||'x'}/final`);
  expect([401,403]).toContain(r.status);
 });
 it('rejects unauthenticated publish',async()=>{
  const r=await request(base).post(`/v1/chits/${process.env.TEST_CHIT_ID||'x'}/publish`).send({});
  expect([401,403]).toContain(r.status);
 });
});
