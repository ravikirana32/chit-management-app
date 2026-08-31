import axios from 'axios';
function normalize(value?:string){let b=(value||'https://chit-management-app.onrender.com').trim().replace(/\/+$/,'');if(b.endsWith('/api/v1'))b=b.slice(0,-3);if(!b.endsWith('/api'))b+='/api';return b;}
export const API_BASE_URL=normalize(process.env.EXPO_PUBLIC_API_URL);
export const api=axios.create({baseURL:API_BASE_URL,timeout:20000,headers:{Accept:'application/json','Content-Type':'application/json'}});
export function setAccessToken(token:string){if(token)api.defaults.headers.common.Authorization=`Bearer ${token}`;else delete api.defaults.headers.common.Authorization;}
api.interceptors.request.use(c=>{c.headers=c.headers??{};c.headers['X-Request-Id']=`mobile-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;c.headers['X-Client-Version']='2.0.0';return c;});
