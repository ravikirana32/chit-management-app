import axios from 'axios';
export const api=axios.create({baseURL:process.env.EXPO_PUBLIC_API_URL||'https://chit-management-app.onrender.com',timeout:20000,headers:{Accept:'application/json','Content-Type':'application/json'}});
export function setAccessToken(token:string){if(token)api.defaults.headers.common.Authorization=`Bearer ${token}`;else delete api.defaults.headers.common.Authorization;}
api.interceptors.request.use(c=>{c.headers=c.headers??{};c.headers['X-Request-Id']=`mobile-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;c.headers['X-Client-Version']='1.0.0';return c});
