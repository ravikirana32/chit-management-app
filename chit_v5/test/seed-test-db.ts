import {Client} from 'pg';
import {randomUUID} from 'crypto';

const db=new Client({connectionString:process.env.TEST_DATABASE_URL||'postgres://postgres:postgres@localhost:5432/chit_app_test'});
const ids={
 creator:'00000000-0000-0000-0000-000000000001',
 m1:'00000000-0000-0000-0000-000000000101',
 m2:'00000000-0000-0000-0000-000000000102',
 m3:'00000000-0000-0000-0000-000000000103',
 m4:'00000000-0000-0000-0000-000000000104',
 agent:'00000000-0000-0000-0000-000000000201',
 fixed:'00000000-0000-0000-0000-000000001001',
 auction:'00000000-0000-0000-0000-000000001002'
};

async function main(){
 await db.connect(); await db.query('BEGIN');
 await db.query(`INSERT INTO users(id,mobile_number,normalized_mobile,name,status,created_at,updated_at)
 VALUES($1,'900000000001','+910000000001','Test Creator','ACTIVE',NOW(),NOW())
 ON CONFLICT(normalized_mobile) DO NOTHING`,[ids.creator]);
 for(let i=1;i<=4;i++){
  const id=(ids as any)[`m${i}`];
  await db.query(`INSERT INTO users(id,mobile_number,normalized_mobile,name,status,created_at,updated_at)
  VALUES($1,$2,$3,$4,'ACTIVE',NOW(),NOW()) ON CONFLICT(normalized_mobile) DO NOTHING`,
  [id,`90000000010${i}`,`+91000000010${i}`,`Test Member ${i}`]);
 }
 await db.query(`INSERT INTO agents(id,user_id,name,mobile,status,created_at,updated_at)
 VALUES($1,$2,'Test Agent','90000000999','ACTIVE',NOW(),NOW()) ON CONFLICT(id) DO NOTHING`,[ids.agent,ids.creator]);
 for(const [id,type,name] of [[ids.fixed,'FIXED_DRAW','Test Fixed'],[ids.auction,'AUCTION','Test Auction']] as const){
  await db.query(`INSERT INTO chits(id,creator_id,name,chit_type,status,total_members,total_months,start_date,due_day,creator_participates,collection_grace_days,agent_commission_mode,created_at,updated_at)
   VALUES($1,$2,$3,$4,'READY_TO_START',4,4,CURRENT_DATE,5,true,7,'PER_AGENT_MONTH',NOW(),NOW())
   ON CONFLICT(id) DO NOTHING`,[id,ids.creator,name,type]);
  for(let m=1;m<=4;m++){
   const agent=m===2;
   await db.query(`INSERT INTO chit_months(id,chit_id,month_number,scheduled_date,scheduled_amount,month_type,status,agent_id,created_at,updated_at)
    VALUES($1,$2,$3,CURRENT_DATE + (($3-1)||' month')::interval,200000,$4,'READY_FOR_ACTION',$5,NOW(),NOW())
    ON CONFLICT(chit_id,month_number) DO NOTHING`,
    [randomUUID(),id,m,agent?'AGENT_CHIT':'ACTION',agent?ids.agent:null]);
  }
  const members=[ids.m1,ids.m2,ids.m3,ids.m4];
  for(let i=0;i<members.length;i++){
   await db.query(`INSERT INTO chit_participants(id,chit_id,user_id,participation_role,status,participant_sequence,joined_at,accepted_at,created_at,updated_at)
    VALUES($1,$2,$3,'PARTICIPANT','ACTIVE',$4,NOW(),NOW(),NOW(),NOW())
    ON CONFLICT(chit_id,user_id) DO NOTHING`,[randomUUID(),id,members[i],i+1]);
  }
 }
 await db.query('COMMIT'); await db.end();
 console.log('Test DB seeded:',JSON.stringify(ids));
}
main().catch(async e=>{console.error(e);try{await db.query('ROLLBACK')}catch{};await db.end();process.exit(1)});
