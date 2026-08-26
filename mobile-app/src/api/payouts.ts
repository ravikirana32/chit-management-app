import { api } from './client';
export const payoutsApi={
 list:(chitId:string)=>api.get(`/v1/payouts/chits/${chitId}`),
 settle:(payoutId:string,payload:any)=>api.post(`/v1/payouts/${payoutId}/settle`,payload),
};
