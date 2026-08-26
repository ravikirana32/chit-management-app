import {tokenStorage} from '@/src/storage/token';
import { setAccessToken } from '@/src/api/client';
import { store } from './index';
import { setBootstrapped,setToken,setUser } from './authSlice';
import { userApi } from '@/src/api/user';

export async function bootstrapAuth(){
 try{
  const token=await tokenStorage.get();
  if(token){
   setAccessToken(token); store.dispatch(setToken(token));
   try{
    const r=await userApi.me(); store.dispatch(setUser(r.data?.data??r.data));
   }catch{}
  }
 }finally{store.dispatch(setBootstrapped(true));}
}
