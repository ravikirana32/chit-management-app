import {auth,db,createFixedPayload,createAuctionPayload} from './real-http.helpers';

describe('real financial HTTP flow',()=>{
 let database:any;
 let fixedId:string;
 let auctionId:string;

 beforeAll(async()=>{
  database=await db();
  if(!process.env.TEST_ACCESS_TOKEN) throw new Error('TEST_ACCESS_TOKEN is required');
  if(!process.env.TEST_AGENT_ID) console.warn('TEST_AGENT_ID not set; agent month is expected to have no agent assignment');
 });

 afterAll(async()=>{await database?.end()});

 it('creates fixed chit with variable monthly amounts and agent month',async()=>{
  const res=await auth().post('/v1/chits').send(createFixedPayload());
  expect(res.status).toBe(201);
  fixedId=res.body.data.id;
  const months=await database.query(`select month_number,scheduled_amount,month_type,agent_id from chit_months where chit_id=$1 order by month_number`,[fixedId]);
  expect(months.rows).toHaveLength(4);
  expect(months.rows.map((x:any)=>x.scheduled_amount)).toEqual(['200000.00','210000.00','195000.00','220000.00']);
  expect(months.rows[1].month_type).toBe('AGENT_CHIT');
 });

 it('creates auction chit',async()=>{
  const res=await auth().post('/v1/chits').send(createAuctionPayload());
  expect(res.status).toBe(201);
  auctionId=res.body.data.id;
  const r=await database.query(`select chit_type from chits where id=$1`,[auctionId]);
  expect(r.rows[0].chit_type).toBe('AUCTION');
 });

 it('lists participants for the fixed chit',async()=>{
  const res=await auth().get(`/v1/chits/${fixedId}/participants`);
  expect([200,403]).toContain(res.status);
 });

 it('publish rejects an incomplete chit',async()=>{
  const res=await auth().post(`/v1/chits/${fixedId}/publish`);
  expect([409,400]).toContain(res.status);
 });

 it('persists creator payment profile independently of chit configuration',async()=>{
  const res=await auth().put('/v1/users/me/payment-profile').send({upiId:'qa@upi',cashAccepted:true});
  expect([200,201]).toContain(res.status);
  const r=await database.query(`select upi_id,cash_accepted from user_payment_profiles where user_id=(select id from users where id=(select creator_id from chits where id=$1))`,[fixedId]);
  expect(r.rows.length).toBeGreaterThan(0);
  expect(r.rows[0].upi_id).toBe('qa@upi');
  expect(r.rows[0].cash_accepted).toBe(true);
 });
});
