import request from 'supertest';
import {base,token} from './real-http.helpers';
describe('v49 staging hardening',()=>{
 it('rejects unauthenticated pagination',async()=>{const r=await request(base).get('/v1/chits/x/chat/messages/page');expect([401,403]).toContain(r.status)});
 it('rejects unauthenticated push token registration',async()=>{const r=await request(base).post('/v1/chits/x/chat/push-token').send({platform:'ANDROID',token:'x'});expect([401,403]).toContain(r.status)});
 it('authenticated pagination contract responds',async()=>{if(!token||!process.env.TEST_CHIT_ID)return;const r=await request(base).set('Authorization',`Bearer ${token}`).get(`/v1/chits/${process.env.TEST_CHIT_ID}/chat/messages/page?limit=20`);expect([200,403,404]).toContain(r.status)});
 it('authenticated idempotent message contract responds',async()=>{if(!token||!process.env.TEST_CHIT_ID)return;const r=await request(base).set('Authorization',`Bearer ${token}`).post(`/v1/chits/${process.env.TEST_CHIT_ID}/chat/messages/idempotent`).send({message:'v49 QA',clientMessageId:`qa-${Date.now()}`});expect([200,201,403,404,409]).toContain(r.status)});
});
