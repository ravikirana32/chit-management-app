import{User}from'@/src/types';
export type Capability='can_view_members'|'can_invite_members'|'can_collect_cash'|'can_verify_payments'|'can_manage_chat'|'can_run_draw'|'can_run_auction'|'can_manage_chit'|'can_view_payout'|'can_settle_payout'|'can_reopen_auction'|'can_open_additional_auction';
export const hasRole=(u:User|null,r:string)=>!!u?.roles?.includes(r as any);export const isAdmin=(u:User|null)=>hasRole(u,'ADMIN');export const isAgent=(u:User|null)=>hasRole(u,'AGENT');export const isMember=(u:User|null)=>hasRole(u,'MEMBER');export const isCreator=(u:User|null,chit:any)=>!!u&&!!chit&&chit.creator_id===u.id;
export const hasCapability=(u:User|null,chit:any,capability:Capability,access?:any)=>{if(isAdmin(u)||isCreator(u,chit))return true;return isAgent(u)&&access?.[capability]===true};
export const canOperate=(u:User|null,chit:any,permission?:Capability,access?:any)=>{if(!permission)return isAdmin(u)||isCreator(u,chit)||isAgent(u);return hasCapability(u,chit,permission,access)};
