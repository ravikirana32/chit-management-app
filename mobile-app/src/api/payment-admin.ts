import { api } from './client';
export const paymentAdminApi={
 pending:(chitId:string)=>api.get(`/v1/payments/chits/${chitId}/pending`),
 verify:(paymentId:string,payload:any)=>api.post(`/v1/payments/${paymentId}/verify`,payload),
 reject:(paymentId:string,payload:any)=>api.post(`/v1/payments/${paymentId}/reject`,payload),
};
