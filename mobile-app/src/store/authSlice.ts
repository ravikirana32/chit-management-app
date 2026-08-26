import { createSlice,PayloadAction } from '@reduxjs/toolkit';
type User={id:string,name?:string,mobile?:string,roles?:string[]};
const slice=createSlice({
 name:'auth',
 initialState:{token:null as string|null,user:null as User|null,bootstrapped:false},
 reducers:{
  setToken:(s,a:PayloadAction<string>)=>{s.token=a.payload},
  setUser:(s,a:PayloadAction<User>)=>{s.user=a.payload},
  setBootstrapped:(s,a:PayloadAction<boolean>)=>{s.bootstrapped=a.payload},
  clear:(s)=>{s.token=null;s.user=null}
 }
});
export const {setToken,setUser,setBootstrapped,clear}=slice.actions;
export default slice.reducer;
