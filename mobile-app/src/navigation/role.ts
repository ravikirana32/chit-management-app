export type AppRole='CREATOR'|'MEMBER';

export function resolveRole(user:any):AppRole{
  const roles=(user?.roles??[]).map((x:string)=>x.toUpperCase());
  if(roles.includes('CREATOR')||roles.includes('OWNER')||roles.includes('CHIT_CREATOR')) return 'CREATOR';
  return 'MEMBER';
}
