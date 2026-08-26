import { api } from './client';
export const ledgerApi={
 participant:(chitId:string,participantId:string)=>
  api.get(`/v1/ledger/chits/${chitId}/me/${participantId}`),
 creator:(chitId:string)=>api.get(`/v1/ledger/chits/${chitId}`),
};
