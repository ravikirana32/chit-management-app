import { api } from './client';
export const profileApi={
 get:()=>api.get('/v1/users/me'),
 updatePaymentProfile:(payload:any)=>api.put('/v1/users/me/payment-profile',payload),
};
