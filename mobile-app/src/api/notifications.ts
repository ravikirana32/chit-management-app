import { api } from './client';
export const notificationsApi = {
  list: () => api.get('/v1/notifications'),
  read: (id:string) => api.patch(`/v1/notifications/${id}/read`),
};
