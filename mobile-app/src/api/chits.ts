import { api } from './client';
export const chitsApi = {
 create:(payload:any)=>api.post('/v1/chits',payload),
 listMine:()=>api.get('/v1/dashboard/me'),
 dashboard:(chitId:string)=>api.get(`/v1/dashboard/chits/${chitId}`),
 updateRules:(chitId:string,payload:any)=>api.put(`/v1/chit-rules/chits/${chitId}`,payload),
 publish:(chitId:string)=>api.post(`/v1/chits/${chitId}/publish`),
};
