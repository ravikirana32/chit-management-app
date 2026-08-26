import request from 'supertest';
import {Client} from 'pg';
import {base,token,db} from './real-http.helpers';

describe('fixed draw -> payout lifecycle',()=>{
 let database:Client;
 const chitId=process.env.TEST_FIXED_READY_CHIT_ID||'';
 const monthId=process.env.TEST_FIXED_MONTH_ID||'';
 let payoutId='';
 beforeAll(async()=>{
  if(!token)throw new Error('TEST_ACCESS_TOKEN is required');
  database=await db();
 });
 afterAll(async()=>database.end());

 it('executes one fixed draw for a real eligible month',async()=>{
  const r=await request(base).set('Authorization',`Bearer ${token}`)
   .post(`/v1/draws/chits/${chitId}/start`).send({chitMonthId:monthId});
  expect([201,400,409]).toContain(r.status);
  if(r.status===201){
   payoutId=r.body.payout?.id;
   expect(r.body.winner).toBeTruthy();
   const d=await database.query(`select count(*)::int n from draw_winners where draw_id=$1`,[r.body.draw.id]);
   expect(d.rows[0].n).toBe(1);
  }
 });

 it('payout exists for the draw winner',async()=>{
  if(!payoutId)return;
  const r=await database.query(`select amount,status from payouts where id=$1`,[payoutId]);
  expect(r.rows[0].status).toBe('PENDING');
  expect(Number(r.rows[0].amount)).toBeGreaterThan(0);
 });
});
