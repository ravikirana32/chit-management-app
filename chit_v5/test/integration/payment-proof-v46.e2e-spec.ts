import request from 'supertest';
import {base,token} from './real-http.helpers';
describe('v46 payment proof and disputes',()=>{
 it('requires auth for proof',async()=>{const r=await request(base).post('/v1/payments/x/proof').send({storageKey:'x',mimeType:'image/jpeg',fileSize:'100'});expect([401,403]).toContain(r.status)});
 it('requires auth for disputes',async()=>{const r=await request(base).post('/v1/payments/x/dispute').send({reason:'Payment not received'});expect([401,403]).toContain(r.status)});
 it('authenticated proof contract responds',async()=>{if(!token||!process.env.TEST_PAYMENT_ID)return;const r=await request(base).set('Authorization',`Bearer ${token}`).post(`/v1/payments/${process.env.TEST_PAYMENT_ID}/proof`).send({storageKey:'private/test.jpg',originalFilename:'payment.jpg',mimeType:'image/jpeg',fileSize:'1000'});expect([200,201,400,403,404,409]).toContain(r.status)});
});
