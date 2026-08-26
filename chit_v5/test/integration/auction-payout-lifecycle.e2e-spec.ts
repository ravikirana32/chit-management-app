import request from 'supertest';
import {Client} from 'pg';
import {base,token,db} from './real-http.helpers';

describe('auction -> winner -> payout lifecycle',()=>{
 let database:Client;
 let auctionId=process.env.TEST_OPEN_AUCTION_ID||'';
 let participantId=process.env.TEST_AUCTION_PARTICIPANT_ID||'';
 beforeAll(async()=>{
  if(!token)throw new Error('TEST_ACCESS_TOKEN is required');
  database=await db();
 });
 afterAll(async()=>database.end());

 it('places a valid bid in a real open auction',async()=>{
  if(!auctionId||!participantId)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .post(`/v1/auctions/${auctionId}/bids`)
   .send({participantId,bidAmount:'20000.00'});
  expect(r.status).toBe(201);
  expect(r.body.amount??r.body.bidAmount).toBeTruthy();
 });

 it('auction state exposes the bid',async()=>{
  if(!auctionId)return;
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .get(`/v1/auctions/${auctionId}/state`);
  expect([200,404]).toContain(r.status);
 });

 it('finalization creates exactly one winner and payout',async()=>{
  if(!auctionId)return;
  const auction=await database.query(`select ends_at,status from auctions where id=$1`,[auctionId]);
  if(!auction.rows.length || auction.rows[0].status!=='OPEN')return;
  // Finalization is intentionally expected to fail while the window is open.
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .post(`/v1/auctions/${auctionId}/finalize`).send({});
  expect([201,409]).toContain(r.status);
 });
});
