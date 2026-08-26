import {readFileSync} from 'fs';
import {join} from 'path';

describe('security configuration regression',()=>{
 const main=readFileSync(join(process.cwd(),'src/main.ts'),'utf8');
 const app=readFileSync(join(process.cwd(),'src/app.module.ts'),'utf8');

 it('enables validation pipe',()=>{
  expect(main).toMatch(/ValidationPipe/);
 });
 it('has Swagger bearer security configuration',()=>{
  expect(main).toMatch(/addBearerAuth|Bearer/);
 });
 it('has authentication module wired',()=>{
  expect(app).toMatch(/AuthModule/);
 });
});
