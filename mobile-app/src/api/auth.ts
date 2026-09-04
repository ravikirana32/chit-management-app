import {api} from './client';

export const authApi = {
  requestOtp: (mobile: string) => api.post('/v1/auth/request-otp', {mobile}),
  verify: (mobile: string, otp: string) => api.post('/v1/auth/verify-otp', {mobile, otp}),
  verifyOtp: (mobile: string, otp: string) => api.post('/v1/auth/verify-otp', {mobile, otp}),
  refresh: (refreshToken: string) => api.post('/v1/auth/refresh', {refreshToken}),
  logout: (refreshToken: string) => api.post('/v1/auth/logout', {refreshToken}),
};
