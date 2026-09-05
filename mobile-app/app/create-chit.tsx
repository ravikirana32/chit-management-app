import React,{useEffect,useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';import{router}from'expo-router';
import{chitsApi,usersApi}from'@/src/api/all';import{Badge,Button,Card,Input,Screen,Select,s}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';import{isAdmin,isAgent}from'@/src/state/roles';import{errMsg,money}from'@/src/lib/format';

const decimal=(v:number)=>Number(v).toFixed(2);

export default function CreateChit(){
 const{user}=useAuth();const[agents,setAgents]=useState<any[]>([]);const[name,setName]=useState('');const[description,setDescription]=useState('');const[type,setType]=useState('FIXED_DRAW');const[members,setMembers]=useState('5');const[months,setMonths]=useState('5');const[start,setStart]=useState(new Date().toISOString().slice(0,10));const[due,setDue]=useState('5');const[creatorParticipates,setCreatorParticipates]=useState(false);const[face,setFace]=useState('25000');const[agentMonths,setAgentMonths]=useState<number[]>([]);const[agentId,setAgentId]=useState('');const[fixedPayouts,setFixedPayouts]=useState<string[]>([]);const[busy,setBusy]=useState(false);
 const nMembers=Math.max(2,Number(members)||2);const nMonths=Math.max(2,Number(months)||2);const installment=Number(face)>0?Number(face)/nMembers:0;
 useEffect(()=>{if(isAdmin(user))usersApi.adminAgents().then(r=>setAgents(Array.isArray(r.data?.data)?r.data.data:[])).catch(()=>{});if(!isAdmin(user))setAgentId('')},[user]);
 useEffect(()=>{setFixedPayouts(p=>Array.from({length:nMonths},(_,i)=>p[i]??String(face)));},[nMonths,face]);
 const agentOptions=useMemo(()=>agents.filter(a=>String(a.status).toUpperCase()==='ACTIVE').map(a=>({label:`${a.name||'Agent'} · ${a.mobile||a.email||''}`,value:String(a.id)})),[agents]);
 const toggle=(m:number)=>setAgentMonths(x=>x.includes(m)?x.filter(v=>v!==m):[...x,m].sort((a,b)=>a-b));
 const schedule=Array.from({length:nMonths},(_,i)=>{const m=i+1;const dt=new Date(start);dt.setMonth(dt.getMonth()+i);dt.setDate(Math.min(Math.max(1,Number(due)||1),28));return{number:m,date:dt.toISOString().slice(0,10),agent:agentMonths.includes(m),amount:installment,payout:agentMonths.includes(m)?Number(face):Number(fixedPayouts[i]||face)}});
 const submit=async()=>{
  if(!name.trim())return Alert.alert('Name required','Enter a name for the chit.');
  if(!Number.isFinite(installment)||installment<=0)return Alert.alert('Invalid total amount','Chit amount must be greater than zero.');
  if(!Number.isFinite(Number(face))||Number(face)<=0)return Alert.alert('Invalid total amount','Enter a valid chit amount.');
  if(isAdmin(user)&&agentMonths.length&&!agentId)return Alert.alert('Agent required','Select the active agent who will operate this chit.');
  if(schedule.some(x=>!Number.isFinite(x.payout)||x.payout<=0))return Alert.alert('Invalid payout','Every fixed-draw payout must be greater than zero.');
  setBusy(true);
  try{
   const payload:any={name:name.trim(),description:description.trim()||undefined,chitType:type,totalMembers:nMembers,totalMonths:nMonths,startDate:start,dueDay:Math.min(28,Math.max(1,Number(due)||1)),creatorParticipates,
    firstMonthlyAmount:decimal(installment),monthlyAmounts:schedule.map(x=>decimal(x.amount)),totalChitAmount:decimal(Number(face)),agentMonthNumbers:agentMonths,agentId:isAdmin(user)?(agentId||undefined):undefined};
   if(type==='FIXED_DRAW')payload.fixedDrawPayoutAmounts=schedule.map(x=>decimal(x.payout));
   const r=await chitsApi.create(payload);const data=r.data?.data??r.data;
   Alert.alert('Chit created','Draft created successfully. The agent assignment is saved by the API.',[{text:'Open setup',onPress:()=>router.replace({pathname:'/chit-setup',params:{chitId:String(data.id)}})}]);
  }catch(e){Alert.alert('Create failed',errMsg(e))}finally{setBusy(false)}
 };
 return <Screen title="Create Chit" subtitle={isAdmin(user)?'ADMIN: select responsible agent':isAgent(user)?'AGENT: your logged-in agent identity is automatic':'Creator'} back={()=>router.back()}><ScrollView keyboardShouldPersistTaps="handled">
 <Card><Text style={s.section}>1. Chit basics</Text><Input label="Chit name" value={name} onChangeText={setName}/><Input label="Description" value={description} onChangeText={setDescription} multiline/><Select label="Chit type" value={type} options={[{label:'Fixed Draw',value:'FIXED_DRAW'},{label:'Auction',value:'AUCTION'}]} onChange={setType}/><View style={s.row}><View style={{flex:1}}><Input label="Members" value={members} onChangeText={setMembers} keyboardType="number-pad"/></View><View style={{flex:1}}><Input label="Months" value={months} onChangeText={setMonths} keyboardType="number-pad"/></View></View><View style={s.row}><View style={{flex:1}}><Input label="Total chit amount" value={face} onChangeText={setFace} keyboardType="decimal-pad"/></View><View style={{flex:1}}><Input label="Due day" value={due} onChangeText={setDue} keyboardType="number-pad"/></View></View><Input label="Start date (YYYY-MM-DD)" value={start} onChangeText={setStart}/><Card><Text style={{fontWeight:'800'}}>Automatic monthly installment</Text><Text style={{fontSize:22,fontWeight:'900'}}>{money(installment)} / member / month</Text><Text style={s.muted}>{money(Number(face)||0)} total ÷ {nMembers} members.</Text></Card>{isAdmin(user)&&<Select label="Responsible agent" value={agentId} options={agentOptions} onChange={setAgentId} placeholder="Select active agent"/>}{isAgent(user)&&<Card><Text style={{fontWeight:'800'}}>Responsible agent</Text><Text style={s.muted}>{String(user?.name||'Logged-in agent')} · assigned automatically</Text><Badge tone="green">AUTOMATIC</Badge></Card>}<Button title={creatorParticipates?'Creator participates: YES':'Creator participates: NO'} secondary onPress={()=>setCreatorParticipates(v=>!v)}/></Card>
 <Card><Text style={s.section}>2. Select AGENT_CHIT months</Text><Text style={s.muted}>These months have no auction/draw. All active members still contribute; the responsible agent receives the full total chit amount.</Text>{schedule.map(m=><Button key={m.number} title={`Month ${m.number}: ${m.agent?'AGENT CHIT':'ACTION'}`} secondary={!m.agent} onPress={()=>toggle(m.number)}/>)}</Card>
 <Card><Text style={s.section}>3. Monthly schedule</Text>{schedule.map((m,i)=><Card key={m.number}><View style={s.row}><Text style={{fontWeight:'900'}}>Month {m.number}</Text><Badge tone={m.agent?'green':'purple'}>{m.agent?'AGENT CHIT':type==='AUCTION'?'AUCTION':'FIXED DRAW'}</Badge></View><Text style={s.muted}>Scheduled date: {m.date}</Text><Text>Members: {nMembers}</Text><Text>Installment: {money(m.amount)} / member</Text>{m.agent?<><Text style={s.success}>Agent payout: {money(Number(face))} (full chit amount)</Text><Text style={s.muted}>No draw / no bid.</Text></>:type==='FIXED_DRAW'?<Input label={`Winner payout — Month ${m.number}`} value={fixedPayouts[i]||''} onChangeText={v=>setFixedPayouts(p=>p.map((x,j)=>j===i?v:x))} keyboardType="decimal-pad"/>:<Text style={s.muted}>Auction payout is calculated from the winning discount.</Text>}</Card>)}</Card>
 <Button title="Create Draft Chit" onPress={submit} disabled={busy}/></ScrollView></Screen>
}
