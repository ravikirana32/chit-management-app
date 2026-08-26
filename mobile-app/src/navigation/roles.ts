export type AppRole='CREATOR'|'MEMBER'|'BOTH';
export function resolveRole(isCreator:boolean,isMember:boolean):AppRole{
 if(isCreator&&isMember)return 'BOTH';
 if(isCreator)return 'CREATOR';
 return 'MEMBER';
}
