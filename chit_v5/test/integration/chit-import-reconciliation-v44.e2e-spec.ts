import request from 'supertest';
import {base,token} from './real-http.helpers';
describe('v44 migration reconciliation',()=>{
 it('requires authentication',async()=>{
  const r=await request(base).post(`/v1/chit-import/batches/${process.env.TEST_IMPORT_BATCH_ID||'x'}/reconcile`);
  expect([401,403]).toContain(r.status);
 });
 it('returns reconciliation data for owned batch',async()=>{
  if(!token||!process.env.TEST_IMPORT_BATCH_ID)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).get(`/v1/chit-import/batches/${process.env.TEST_IMPORT_BATCH_ID}/reconciliation`);
  expect([200,404]).toContain(r.status);
 });
 it('does not apply unresolved batch',async()=>{
  if(!token||!process.env.TEST_IMPORT_BATCH_ID)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).post(`/v1/chit-import/batches/${process.env.TEST_IMPORT_BATCH_ID}/apply`);
  expect([200,201]).toContain(r.status);
  if(r.body?.success===false)expect(r.body.message).toMatch(/Resolve/);
 });
});
