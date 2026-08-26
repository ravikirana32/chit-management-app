import {existsSync,readFileSync} from 'fs';
import {join} from 'path';

describe('v45 final release preflight',()=>{
 const root=join(process.cwd(),'..');
 it('contains cumulative version status documents',()=>{
  expect(existsSync(join(root,'V41_FINAL_STATUS.md'))).toBe(true);
  expect(existsSync(join(root,'V42_STATUS.md'))).toBe(true);
  expect(existsSync(join(root,'V43_STATUS.md'))).toBe(true);
  expect(existsSync(join(root,'V44_STATUS.md'))).toBe(true);
 });
 it('contains production deployment assets',()=>{
  expect(existsSync(join(root,'docker-compose.prod.yml'))).toBe(true);
  expect(existsSync(join(root,'infra/nginx/nginx.conf'))).toBe(true);
  expect(existsSync(join(process.cwd(),'Dockerfile'))).toBe(true);
 });
 it('contains migration safety documentation',()=>{
  expect(existsSync(join(root,'V43_IMPORT_TEMPLATE.md'))).toBe(true);
  expect(existsSync(join(root,'V44_MIGRATION_RECONCILIATION.md'))).toBe(true);
 });
 it('production env example contains placeholders rather than known credentials',()=>{
  const x=readFileSync(join(root,'.env.production.example'),'utf8');
  expect(x).toMatch(/CHANGE_ME/);
  expect(x).not.toMatch(/password123|secret123/i);
 });
});
