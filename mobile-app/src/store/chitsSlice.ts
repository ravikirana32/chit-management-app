import { createSlice,PayloadAction } from '@reduxjs/toolkit';

const slice=createSlice({
 name:'chits',
 initialState:{selected:null as any|null,items:[] as any[],loading:false},
 reducers:{
  setSelected:(s,a:PayloadAction<any>)=>{s.selected=a.payload},
  setItems:(s,a:PayloadAction<any[]>)=>{s.items=a.payload},
  setLoading:(s,a:PayloadAction<boolean>)=>{s.loading=a.payload},
 }
});
export const {setSelected,setItems,setLoading}=slice.actions;
export default slice.reducer;
