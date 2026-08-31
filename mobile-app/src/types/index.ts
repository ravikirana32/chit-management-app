export type Role='MEMBER'|'CREATOR'|'AGENT'|'ADMIN'|'WINNER'|'OWNER'|'CHIT_CREATOR';
export type ChitType='FIXED_DRAW'|'AUCTION';
export type MonthType='ACTION'|'AGENT_CHIT';
export type User={id:string;name?:string;mobile?:string;roles?:Role[];participantId?:string};
export type Chit={id:string;name:string;description?:string;chit_type?:ChitType;status:string;total_members:number;total_months:number;total_chit_amount:number|string;accumulated_savings_amount?:number|string;completed_months?:number;start_date:string;due_day:number;creator_id?:string;months?:ChitMonth[];currentSavings?:number};
export type ChitMonth={id:string;chit_id:string;month_number:number;scheduled_date:string;scheduled_amount:number|string;winner_payout_amount:number|string;month_type:MonthType;status:string;agent_id?:string|null;draw_interest_opens_at?:string|null;draw_interest_closes_at?:string|null;draw_at?:string|null;verified_collections?:number|string};
export type Obligation={id:string;chitMonthId:string;chitParticipantId:string;participantSequence:number;dueAmount:number;paidAmount:number;outstandingAmount:number;status:string;dueDate:string;userId?:string};
export type Payment={id:string;participantId:string;participantSequence:number;userId?:string;obligationId:string;amount:number;paymentMethod:string;status:string;transactionReference?:string;paymentDate?:string;submittedAt?:string;verifiedAt?:string;receiptNumber?:string;notes?:string;outstandingAmount?:number;obligationStatus?:string};
