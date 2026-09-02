import React,{useCallback,useEffect,useState}from'react';
import{Alert,Text}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{chitsApi,closeApi}from'@/src/api/all';
import{Button,Card,Loading,Screen,s}from'@/src/components/UI';
import{errMsg,money}from'@/src/lib/format';

export default function MonthClose(){
 const{chitId,monthId}=useLocalSearchParams<{chitId?:string;monthId?:string}>();
 const[chit,setChit]=useState<any>();
 const[month,setMonth]=useState<any>();
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  if(!chitId||!monthId){setError('Chit ID and Month ID are required.');setLoading(false);return}
  setLoading(true);setError('');
  try{
   const r=await chitsApi.get(String(chitId));
   const d=r?.data?.data??r?.data;
   if(!d||typeof d!=='object')throw new Error('Invalid chit response');
   const m=Array.isArray(d.months)?d.months.find((x:any)=>String(x.id)===String(monthId)):undefined;
   if(!m)throw new Error('Month not found in chit schedule. Please reopen this screen from the chit schedule.');
   setChit(d);setMonth(m);
  }catch(e){setError(errMsg(e))}finally{setLoading(false)}
 },[chitId,monthId]);
 useEffect(()=>{load()},[load]);
 const close=async()=>{
  if(!monthId||!month){Alert.alert('Cannot close month','The selected month could not be loaded.');return}
  const status=String(month.status||'').toUpperCase();
  if(status==='LOCKED'){Alert.alert('Already locked','This month is already locked.');return}
  if(status!=='COMPLETED'){Alert.alert('Month not ready',`Month ${String(month.month_number)} must be financially completed before it can be locked.`);return}
  setBusy(true);
  try{
   const r=await closeApi.month(String(monthId));
   const d=r?.data?.data??r?.data;
   Alert.alert('Month locked',`Month ${String(d?.month_number??month.month_number)} has been financially closed.`,[{text:'OK',onPress:()=>router.back()}]);
  }catch(e){Alert.alert('Cannot close month',errMsg(e))}finally{setBusy(false)}
 };
 if(loading)return <Screen title="Month Close" back={()=>router.back()}><Loading/></Screen>;
 if(error)return <Screen title="Month Close" back={()=>router.back()}><Card><Text style={s.danger}>{String(error)}</Text><Button title="Retry" onPress={load}/><Button title="Back" secondary onPress={()=>router.back()}/></Card></Screen>;
 const status=String(month?.status||'').toUpperCase();
 const ready=status==='COMPLETED';
 return <Screen title="Month Close" subtitle="Final reconciliation → LOCKED" back={()=>router.back()}>
  <Card>
   <Text style={s.section}>Lock Month {String(month?.month_number??'—')}</Text>
   <Text>Scheduled contribution: {money(month?.scheduled_amount)} / member</Text>
   <Text>Planned payout: {money(month?.winner_payout_amount)}</Text>
   <Text style={s.muted}>Current status: {status||'UNKNOWN'}</Text>
   <Text style={s.muted}>Use this only after the draw/auction/agent payout is settled and all obligations are resolved. Locked months cannot be normally edited.</Text>
   {status==='LOCKED'?<Button title="Month Already Locked" disabled onPress={()=>{}}/>:<Button title="Close & Lock Month" onPress={close} disabled={busy||!ready}/>} 
   {!ready&&status!=='LOCKED'&&<Text style={s.danger}>Month close is available only after the financial operation has completed successfully.</Text>}
  </Card>
 </Screen>
}
