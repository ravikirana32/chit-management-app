import AsyncStorage from '@react-native-async-storage/async-storage';
import React,{createContext,useContext,useEffect,useState} from 'react';
import {api,setAccessToken} from '@/src/api/client';
import {User} from '@/src/types';

type Ctx={user:User|null;token:string|null;ready:boolean;login:(mobile:string,otp:string)=>Promise<void>;logout:()=>Promise<void>;refreshUser:()=>Promise<void>};
const AuthContext=createContext<Ctx>({user:null,token:null,ready:false,login:async()=>{},logout:async()=>{},refreshUser:async()=>{}});
export function AuthProvider({children}:{children:React.ReactNode}){
 const [token,setToken]=useState<string|null>(null); const [user,setUser]=useState<User|null>(null); const [ready,setReady]=useState(false);
 const refreshUser=async()=>{const r=await api.get('/v1/users/me');setUser(r.data?.data??r.data)};
 useEffect(()=>{(async()=>{try{const t=await AsyncStorage.getItem('accessToken');if(t){setAccessToken(t);setToken(t);try{await refreshUser()}catch{await AsyncStorage.removeItem('accessToken');setAccessToken('');setToken(null)}}}finally{setReady(true)}})()},[]);
 const login=async(mobile:string,otp:string)=>{const r=await api.post('/v1/auth/verify-otp',{mobile,otp});const d=r.data?.data??r.data;setAccessToken(d.accessToken);setToken(d.accessToken);await AsyncStorage.setItem('accessToken',d.accessToken);setUser(d.user);};
 const logout=async()=>{await AsyncStorage.removeItem('accessToken');setAccessToken('');setToken(null);setUser(null)};
 return <AuthContext.Provider value={{user,token,ready,login,logout,refreshUser}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
