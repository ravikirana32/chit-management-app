import request from 'supertest';
import {base,token,db} from './real-http.helpers';
describe('v43 existing chit import',()=>{
 it('validates duplicate months and unknown member payment references',async()=>{
  if(!token)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).post('/v1/chit-import/validate').send({
   chitId:process.env.TEST_CHIT_ID||'x',currentMonthNumber:5,
   members:[{memberId:'m1',name:'A'}],
   months:[{monthNumber:1,amount:'10000'},{monthNumber:1,amount:'10000'}],
   payments:[{monthNumber:1,memberId:'unknown',amount:'10000',method:'CASH'}]
  });
  expect(r.status).toBe(201);expect(r.body.data.valid).toBe(false);
 });
 it('creates a draft import batch',async()=>{
  if(!token||!process.env.TEST_CHIT_ID)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`).post('/v1/chit-import/create-batch').send({chitId:process.env.TEST_CHIT_ID,currentMonthNumber:5,members:[],months:[],payments:[]});
  expect([200,201]).toContain(r.status);
 });
 it('unauthenticated import is rejected',async()=>{
  const r=await request(base).post('/v1/chit-import/validate').send({chitId:'x',currentMonthNumber:5,members:[],months:[],payments:[]});
  expect([401,403]).toContain(r.status);
 });
});
