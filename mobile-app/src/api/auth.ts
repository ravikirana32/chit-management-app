import { api,setAccessToken } from './client';
import { store } from '@/src/store';
import { setToken } from '@/src/store/authSlice';
import {tokenStorage} from '@/src/storage/token';

export const authApi={
 async requestOtp(mobile:string){ return api.post('/v1/auth/request-otp',{mobile}); },
 async verifyOtp(mobile:string,otp:string){
   const {data}=await api.post('/v1/auth/verify-otp',{mobile,otp});
   const token=data.data?.accessToken??data.accessToken;
   setAccessToken(token); store.dispatch(setToken(token));
   await tokenStorage.set(token);
   return token;
 },
 async logout(){ await tokenStorage.clear(); store.dispatch({type:'auth/clear'}); }
};
