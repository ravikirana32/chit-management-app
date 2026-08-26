import request from 'supertest';
import {Client} from 'pg';

export const base=process.env.TEST_API_URL||'http://localhost:3000';
export const token=process.env.TEST_ACCESS_TOKEN||'';
export const dbUrl=process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test';

export function auth(){
 if(!token) throw new Error('TEST_ACCESS_TOKEN is required');
 return request(base).set('Authorization',`Bearer ${token}`);
}
export async function db(){
 const c=new Client({connectionString:dbUrl}); await c.connect(); return c;
}
export function createFixedPayload(){
 return {
  name:'HTTP QA Fixed',
  description:'Deterministic integration test',
  chitType:'FIXED_DRAW',
  totalMembers:4,
  totalMonths:4,
  startDate:'2026-09-05',
  dueDay:5,
  creatorParticipates:true,
  firstMonthlyAmount:'200000.00',
  monthlyAmounts:['200000.00','210000.00','195000.00','220000.00'],
  agentMonthNumbers:[2],
  agentId:process.env.TEST_AGENT_ID
 };
}
export function createAuctionPayload(){
 return {...createFixedPayload(),name:'HTTP QA Auction',chitType:'AUCTION'};
}
