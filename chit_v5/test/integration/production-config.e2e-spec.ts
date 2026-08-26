import {existsSync,readFileSync} from 'fs';
import {join} from 'path';

describe('production infrastructure contracts',()=>{
 it('has production compose',()=>expect(existsSync(join(process.cwd(),'../docker-compose.prod.yml'))).toBe(true));
 it('has production Dockerfile',()=>expect(existsSync(join(process.cwd(),'Dockerfile'))).toBe(true));
 it('has nginx config',()=>expect(existsSync(join(process.cwd(),'../infra/nginx/nginx.conf'))).toBe(true));
 it('does not commit production secrets',()=>{
  const env=readFileSync(join(process.cwd(),'../.env.production.example'),'utf8');
  expect(env).toContain('CHANGE_ME');
  expect(env).not.toContain('password123');
 });
});
