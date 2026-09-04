import {api} from './client';

export const agentApi = {
  dashboard: () => api.get('/v1/agents/me/dashboard'),
  myChits: async () => {
    const r: any = await api.get('/v1/agents/me/dashboard');
    const d = r.data?.data ?? r.data;
    return {...r, data: {data: d?.chits ?? []}};
  },
  chit: (id: string) => api.get(`/v1/agents/me/chits/${id}`),
  assign: (id: string, payload: any) => api.post(`/v1/chits/${id}/agents`, payload),
  update: (id: string, agentId: string, payload: any) => api.put(`/v1/chits/${id}/agents/${agentId}`, payload),
};
