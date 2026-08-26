import request from 'supertest';
import {base,token} from './real-http.helpers';

describe('end-of-chit reconciliation',()=>{
 it('returns final financial completion state',async()=>{
  if(!token)throw new Error('TEST_ACCESS_TOKEN is required');
  const chit=process.env.TEST_CHIT_ID||'';
  if(!chit)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).get(`/v1/reconciliation/chits/${chit}/final`);
  expect(r.status).toBe(200);
  expect(typeof r.body?.data?.complete).toBe('boolean');
  expect(r.body.data.months).toBeTruthy();
  expect(r.body.data.obligations).toBeTruthy();
  expect(r.body.data.payouts).toBeTruthy();
 });
});
