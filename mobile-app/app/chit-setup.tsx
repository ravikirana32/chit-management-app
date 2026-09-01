import React,{useEffect,useState}from'react';
import{Alert,ScrollView,Text}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{chitsApi,usersApi}from'@/src/api/all';
import{Button,Card,Input,Loading,Screen,Select,s}from'@/src/components/UI';
import{errMsg}from'@/src/lib/format';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isAgent}from'@/src/state/roles';

export default function ChitSetup(){
 const{chitId}=useLocalSearchParams<{chitId:string}>();
 const[chit,setChit]=useState<any>(); const[months,setMonths]=useState<any[]>([]);
 const[agents,setAgents]=useState<any[]>([]); const{user}=useAuth(); const[busy,setBusy]=useState(false);
 useEffect(()=>{if(isAdmin(user))usersApi.adminAgents().then(r=>setAgents(r.data?.data??[])).catch(()=>{});
   if(chitId)chitsApi.get(String(chitId)).then(r=>{const d=r.data?.data??r.data;setChit(d);setMonths(d.months||[])})
   .catch(e=>Alert.alert('Load failed',errMsg(e)))},[chitId,user]);
 if(!chit)return <Screen title="Schedule"><Loading/></Screen>;
 const status=String(chit.status||'').toUpperCase();
 const editable=['DRAFT','INVITING','MEMBERS_CONFIRMED'].includes(status);
 const update=(i:number,k:string,v:any)=>setMonths(x=>x.map((m,j)=>j===i?{...m,[k]:v}:m));
 const save=async()=>{setBusy(true);try{await chitsApi.saveSchedule(String(chitId),{totalChitAmount:String(chit.total_chit_amount),months:months.map(m=>({monthNumber:Number(m.month_number),scheduledDate:m.scheduled_date,scheduledAmount:String(m.scheduled_amount),winnerPayoutAmount:String(m.winner_payout_amount),monthType:m.month_type,agentId:m.agent_id||undefined}))});Alert.alert('Saved','Schedule updated');setChit((x:any)=>({...x,status:x.status}))}catch(e){Alert.alert('Save failed',errMsg(e))}finally{setBusy(false)}};
 const publish=async()=>{setBusy(true);try{await chitsApi.publish(String(chitId));Alert.alert('Published','The chit is now ready to start.');router.replace({pathname:'/chit-detail',params:{chitId:String(chitId)}})}catch(e){Alert.alert('Publish failed',errMsg(e))}finally{setBusy(false)}};
 return <Screen title="Monthly Schedule" subtitle={chit.name} back={()=>router.back()}><ScrollView>
   {status==='READY_TO_START'&&<Card><Text style={s.section}>Configuration locked</Text><Text style={s.muted}>This chit is already published. Monthly schedule cannot be changed.</Text><Button title="Back to Chit" onPress={()=>router.replace({pathname:'/chit-detail',params:{chitId:String(chitId)}})}/></Card>}
   {months.map((m,i)=><Card key={m.id}><Text style={s.section}>Month {m.month_number}</Text>
     <Select label="Type" value={m.month_type} options={[{label:'ACTION',value:'ACTION'},{label:'AGENT CHIT',value:'AGENT_CHIT'}]} onChange={v=>{if(editable)update(i,'month_type',v);if(v==='AGENT_CHIT'&&!m.agent_id&&isAgent(user))update(i,'agent_id',user.id)}}/>
     <Input label="Scheduled date" value={String(m.scheduled_date)} onChangeText={v=>editable&&update(i,'scheduled_date',v)} editable={editable}/>
     <Input label="Contribution/member" value={String(m.scheduled_amount)} onChangeText={v=>editable&&update(i,'scheduled_amount',v)} keyboardType="decimal-pad" editable={editable}/>
     <Input label="Payout" value={String(m.winner_payout_amount)} onChangeText={v=>editable&&update(i,'winner_payout_amount',v)} keyboardType="decimal-pad" editable={editable}/>
     {m.month_type==='AGENT_CHIT'&&(isAdmin(user)?<Select label="Agent" value={m.agent_id||''} options={agents.filter((a:any)=>a.status==='ACTIVE').map((a:any)=>({label:`${a.name} · ${a.mobile}`,value:a.id}))} onChange={v=>editable&&update(i,'agent_id',v)} placeholder="Select active agent"/>:<Text style={s.muted}>Agent: {m.agent_id||user?.id||'Configured agent'}</Text>)}
   </Card>)}
   {editable&&<><Button title="Save Schedule" onPress={save} disabled={busy}/><Button title="Publish Chit" onPress={publish} disabled={busy}/></>}
 </ScrollView></Screen>
}
