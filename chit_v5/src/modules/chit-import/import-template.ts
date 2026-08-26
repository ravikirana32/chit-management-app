export const memberColumns=['memberId','name','mobile','upiId','sequence'];
export const monthColumns=['monthNumber','amount','completedAt','winnerMemberId','winnerName','monthType'];
export const paymentColumns=['monthNumber','memberId','amount','method','reference','notes'];
export const supportedPaymentMethods=['UPI','CASH','BANK_TRANSFER','OTHER'] as const;
export type HistoricalSource='HISTORICAL_IMPORT'|'LIVE';
