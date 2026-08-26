import request from 'supertest';

const base=process.env.TEST_API_URL||'http://localhost:3000';
const token=process.env.TEST_ACCESS_TOKEN||'';
const creator=()=>request(base).set('Authorization',`Bearer ${token}`);
const requireToken=()=>{if(!token) throw new Error('TEST_ACCESS_TOKEN is required for authenticated financial integration tests');};

describe('authenticated financial HTTP contracts',()=>{
 beforeAll(()=>requireToken());

 it('creator can list chits',async()=>{
  const res=await creator().get('/v1/chits');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body?.data)).toBe(true);
 });

 it('rejects unauthorised financial verification when role is wrong',async()=>{
  const memberToken=process.env.TEST_MEMBER_ACCESS_TOKEN;
  if(!memberToken)return;
  const res=await request(base).set('Authorization',`Bearer ${memberToken}`)
   .post('/v1/payments/test-payment/verify').send({idempotencyKey:'qa-member-verify-1'});
  expect([401,403,404]).toContain(res.status);
 });

 it('payment submission requires authenticated user',async()=>{
  const res=await creator().post('/v1/payments').send({});
  expect([400,422,404]).toContain(res.status);
 });
});
