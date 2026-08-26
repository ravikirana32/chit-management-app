import { api } from './client';

export const paymentsApi = {
  create: (payload:any) => api.post('/v1/payments',payload),
  myLedger: (chitId:string,participantId:string) =>
    api.get(`/v1/ledger/chits/${chitId}/me/${participantId}`),
  notifications: () => api.get('/v1/notifications'),
};
