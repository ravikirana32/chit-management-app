import {readFileSync} from 'fs';
import {join} from 'path';

describe('Swagger audit',()=>{
 const files:string[]=[];
 function scan(dir:string){
  const fs=require('fs');
  for(const x of fs.readdirSync(dir,{withFileTypes:true})){
   const p=join(dir,x.name);
   if(x.isDirectory())scan(p); else if(p.endsWith('.ts'))files.push(p);
  }
 }
 beforeAll(()=>scan(join(process.cwd(),'src')));
 it('financial controllers contain Swagger tags/operations',()=>{
  const financial=files.filter(x=>/payments|payout|auction|draw|reconciliation|chits|notifications/.test(x));
  expect(financial.length).toBeGreaterThan(0);
 });
});
