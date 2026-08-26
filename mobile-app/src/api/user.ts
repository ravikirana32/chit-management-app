import { api } from './client';
export const userApi = {
  me: () => api.get('/v1/users/me'),
};
