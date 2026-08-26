import { api } from './client';
export const membersApi={
 list:(chitId:string)=>api.get(`/v1/chits/${chitId}/participants`),
 invite:(chitId:string,payload:any)=>api.post(`/v1/chits/${chitId}/participants/invite`,payload),
};
