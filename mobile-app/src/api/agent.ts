import { api } from './client';
export const agentApi={
 recordCommission:(chitId:string,monthId:string,payload:any)=>
  api.post(`/v1/agent-commission/chits/${chitId}/months/${monthId}`,payload),
};
