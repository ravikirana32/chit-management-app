import {existsSync,readFileSync} from 'fs';
import {join} from 'path';

describe('v41 release audit',()=>{
 it('has package metadata',()=>{
  const p=JSON.parse(readFileSync(join(process.cwd(),'package.json'),'utf8'));
  expect(p.name).toBeTruthy();
  expect(p.version).toBeTruthy();
 });
 it('has migrations directory',()=>expect(existsSync(join(process.cwd(),'migrations'))).toBe(true));
 it('has Docker production image definition',()=>expect(existsSync(join(process.cwd(),'Dockerfile'))).toBe(true));
 it('has OpenAPI/Swagger references',()=>{
  const m=readFileSync(join(process.cwd(),'src/main.ts'),'utf8');
  expect(m).toMatch(/SwaggerModule|DocumentBuilder/);
 });
});
