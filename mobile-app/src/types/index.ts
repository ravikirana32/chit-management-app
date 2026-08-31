export type Role='MEMBER'|'CREATOR'|'AGENT'|'ADMIN'|'WINNER'|'OWNER'|'CHIT_CREATOR';
export type User={id:string;name?:string;mobile?:string;roles?:Role[];participantId?:string};
export type Chit={id:string;name:string;description?:string;chit_type?:string;status:string;total_members:number;total_months:number;total_chit_amount:number|string;accumulated_savings_amount?:number|string;completed_months?:number;start_date:string;due_day:number;creator_id?:string;months?:any[];currentSavings?:number};
