import { api } from './client';
export const drawsApi = {
  current: (chitId:string) => api.get(`/v1/draws/chits/${chitId}/current`),
  execute: (chitId:string,monthId:string) => api.post(`/v1/draws/chits/${chitId}/months/${monthId}/execute`,{}),
};
