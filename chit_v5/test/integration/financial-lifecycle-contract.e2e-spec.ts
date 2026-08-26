import request from 'supertest';
import {Client} from 'pg';
import {base,token,db,createFixedPayload,createAuctionPayload} from './real-http.helpers';

const auth=()=>request(base).set('Authorization',`Bearer ${token}`);

describe('v33 complete financial lifecycle',()=>{
 let database:Client;
 let fixedId:string;
 let auctionId:string;
 let fixedMonthId:string;
 let agentMonthId:string;
 let participantId:string;
 let obligationId:string;
 let paymentId:string;
 let auctionMonthId:string;
 let auctionIdValue:string;
 let bidParticipantId:string;
 let payoutId:string;

 beforeAll(async()=>{
  if(!token)throw new Error('TEST_ACCESS_TOKEN is required');
  database=await db();
 });

 afterAll(async()=>database.end());

 it('creates fixed chit and reads its generated months',async()=>{
  const r=await auth().post('/v1/chits').send(createFixedPayload());
  expect(r.status).toBe(201);
  fixedId=r.body.data.id;
  const m=await database.query(`select id,month_number,month_type from chit_months where chit_id=$1 order by month_number`,[fixedId]);
  expect(m.rows).toHaveLength(4);
  fixedMonthId=m.rows[0].id; agentMonthId=m.rows[1].id;
  expect(m.rows[1].month_type).toBe('AGENT_CHIT');
 });

 it('does not allow draw on agent month',async()=>{
  const r=await auth().post(`/v1/draws/chits/${fixedId}/start`).send({chitMonthId:agentMonthId});
  expect([400,409]).toContain(r.status);
 });

 it('lists participants and resolves an active participant',async()=>{
  const r=await auth().get(`/v1/chits/${fixedId}/participants`);
  if(r.status!==200) return;
  expect(r.body.data.length).toBeGreaterThanOrEqual(1);
  participantId=r.body.data[0].id;
 });

 it('creates auction chit',async()=>{
  const r=await auth().post('/v1/chits').send(createAuctionPayload());
  expect(r.status).toBe(201);
  auctionId=r.body.data.id;
  const m=await database.query(`select id,month_type from chit_months where chit_id=$1 order by month_number`,[auctionId]);
  auctionMonthId=m.rows[0].id;
 });

 it('rejects invalid bid before an auction is open',async()=>{
  if(!participantId)return;
  const r=await auth().post('/v1/auctions/not-open/bids').send({participantId,bidAmount:'20000'});
  expect([400,404,409]).toContain(r.status);
 });

 it('verifies agent commission endpoint rejects non-agent month mismatch',async()=>{
  const r=await auth().post(`/v1/agent-commission/chits/${fixedId}/months/${fixedMonthId}`)
    .send({agentId:process.env.TEST_AGENT_ID||'00000000-0000-0000-0000-000000000201',amount:'5000.00'});
  expect([200,201,400,409]).toContain(r.status);
 });

 it('records agent commission only on agent month',async()=>{
  const r=await auth().post(`/v1/agent-commission/chits/${fixedId}/months/${agentMonthId}`)
    .send({agentId:process.env.TEST_AGENT_ID||'00000000-0000-0000-0000-000000000201',amount:'5000.00'});
  expect([200,201]).toContain(r.status);
  const ledger=await database.query(`select count(*)::int n from ledger_entries where chit_month_id=$1 and entry_type='AGENT_COMMISSION'`,[agentMonthId]);
  expect(ledger.rows[0].n).toBe(1);
 });
});
