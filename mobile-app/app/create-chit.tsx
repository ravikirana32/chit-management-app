import React,{useEffect,useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router}from'expo-router';
import{chitsApi,usersApi}from'@/src/api/all';
import{Badge,Button,Card,Input,Screen,Select,s}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isAgent}from'@/src/state/roles';
import{errMsg,money}from'@/src/lib/format';

export default function CreateChit(){
 const{user}=useAuth();
 const[agents,setAgents]=useState<any[]>([]);const[name,setName]=useState('');const[description,setDescription]=useState('');const[type,setType]=useState('FIXED_DRAW');
 const[members,setMembers]=useState('5');const[months,setMonths]=useState('5');const[start,setStart]=useState(new Date().toISOString().slice(0,10));const[due,setDue]=useState('5');const[creatorParticipates,setCreatorParticipates]=useState(false);const[face,setFace]=useState('25000');const[agentMonths,setAgentMonths]=useState<number[]>([]);const[agentId,setAgentId]=useState('');const[fixedPayouts,setFixedPayouts]=useState<string[]>([]);const[busy,setBusy]=useState(false);
 const nMembers=Math.max(1,Number(members)||1);const nMonths=Math.max(1,Number(months)||1);const installment=Number(face)>0&&nMembers>0?Number(face)/nMembers:0;
 useEffect(()=>{if(isAdmin(user))usersApi.adminAgents().then(r=>setAgents(Array.isArray(r.data?.data)?r.data.data:[])).catch(()=>{});if(isAgent(user)&&user?.id)setAgentId(String(user.id));},[user]);
 useEffect(()=>{setFixedPayouts(p=>Array.from({length:nMonths},(_,i)=>p[i]??String(face)));},[nMonths,face]);
 const agentOptions=useMemo(()=>agents.filter(a=>String(a.status).toUpperCase()==='ACTIVE').map(a=>({label:`${a.name||'Agent'} · ${a.mobile||a.email||''}`,value:String(a.id)})),[agents]);
 const toggleAgentMonth=(m:number)=>setAgentMonths(x=>x.includes(m)?x.filter(v=>v!==m):[...x,m]);
 const schedule=Array.from({length:nMonths},(_,i)=>{const m=i+1;const d=new Date(start);d.setMonth(d.getMonth()+i);d.setDate(Math.min(Math.max(1,Number(due)||1),28));return{number:m,date:d.toISOString().slice(0,10),agent:agentMonths.includes(m),amount:installment,payout:agentMonths.includes(m)?Number(face):Number(fixedPayouts[i]||face)}});
 const submit=async()=>{
  if(!name.trim())return Alert.alert('Name required','Enter a name for the chit.');if(nMembers<2)return Alert.alert('Members','At least 2 members are required.');if(nMonths<2)return Alert.alert('Months','At least 2 months are required.');if(!Number.isFinite(installment)||installment<=0)return Alert.alert('Invalid total amount','Chit amount must be greater than zero.');
  if(isAdmin(user)&&!agentId)return Alert.alert('Agent required','Select the agent who will operate this chit and receive AGENT_CHIT payouts.');
  if(agentMonths.length&&!agentId)return Alert.alert('Agent required','AGENT_CHIT months require an active agent.');
  setBusy(true);try{
   const payload:any={name:name.trim(),description:description.trim()||undefined,chitType:type,totalMembers:nMembers,totalMonths:nMonths,startDate:start,dueDay:Math.min(28,Math.max(1,Number(due)||1)),creatorParticipates,monthlyAmounts:schedule.map(x=>x.amount),totalChitAmount:Number(face),agentMonthNumbers:agentMonths,agentId:agentId||undefined};
   if(type==='FIXED_DRAW')payload.fixedDrawPayoutAmounts=schedule.map(x=>x.payout);
   const r=await chitsApi.create(payload);const d=r.data?.data??r.data;
   Alert.alert('Chit created','Draft created successfully. The agent assignment is saved by the API.',[{text:'Open setup',onPress:()=>router.replace({pathname:'/chit-setup',params:{chitId:String(d.id)}})}]);
  }catch(e){Alert.alert('Create failed',errMsg(e))}finally{setBusy(false)}
 };
 return <Screen title="Create Chit" subtitle={isAdmin(user)?'ADMIN: select responsible agent':isAgent(user)?'AGENT: your logged-in agent identity is automatic':'Creator'} back={()=>router.back()}>
  <ScrollView keyboardShouldPersistTaps="handled">
   <Card><Text style={s.section}>1. Chit basics</Text><Input label="Chit name" value={name} onChangeText={setName} placeholder="My Chit"/><Input label="Description" value={description} onChangeText={setDescription} placeholder="Optional" multiline/><Select label="Chit type" value={type} options={[{label:'Fixed Draw',value:'FIXED_DRAW'},{label:'Auction',value:'AUCTION'}]} onChange={setType}/>
    <View style={s.row}><View style={{flex:1}}><Input label="Members" value={members} onChangeText={setMembers} keyboardType="number-pad"/></View><View style={{flex:1}}><Input label="Months" value={months} onChangeText={setMonths} keyboardType="number-pad"/></View></View>
    <View style={s.row}><View style={{flex:1}}><Input label="Total chit amount" value={face} onChangeText={setFace} keyboardType="decimal-pad"/></View><View style={{flex:1}}><Input label="Due day" value={due} onChangeText={setDue} keyboardType="number-pad"/></View></View>
    <Input label="Start date (YYYY-MM-DD)" value={start} onChangeText={setStart}/>
    <Card><Text style={{fontWeight:'800'}}>Automatic monthly installment</Text><Text style={{fontSize:22,fontWeight:'900'}}>{money(installment)} / member / month</Text><Text style={s.muted}>{money(face)} total ÷ {nMembers} members = {money(installment)} per member.</Text></Card>
    {isAdmin(user)&&<Select label="Responsible agent" value={agentId} options={agentOptions} onChange={setAgentId} placeholder="Select active agent"/>}
    {isAgent(user)&&<Card><Text style={{fontWeight:'800'}}>Responsible agent</Text><Text style={s.muted}>{user?.name||'Logged-in agent'} · assigned automatically</Text><Badge tone="green">AUTOMATIC</Badge></Card>}
    <Button title={creatorParticipates?'Creator participates: YES':'Creator participates: NO'} secondary onPress={()=>setCreatorParticipates(v=>!v)}/>
   </Card>
   <Card><Text style={s.section}>2. Select AGENT_CHIT months</Text><Text style={s.muted}>Select the months that are agent months. They have no draw or auction. Every active member still pays the automatic monthly installment. The responsible agent receives the full total chit amount for each AGENT_CHIT month.</Text>{schedule.map(m=><Button key={m.number} title={`Month ${m.number}: ${m.agent?'AGENT CHIT':'ACTION'}`} secondary={!m.agent} onPress={()=>toggleAgentMonth(m.number)}/>)}</Card>
   <Card><Text style={s.section}>3. Monthly schedule</Text><Text style={s.muted}>The contribution is calculated automatically. AGENT_CHIT payout is fixed to the total chit amount; action-month fixed-draw payouts can be adjusted here.</Text>{schedule.map((m,i)=><Card key={m.number}><View style={s.row}><Text style={{fontWeight:'900'}}>Month {m.number}</Text><Badge tone={m.agent?'green':'purple'}>{m.agent?'AGENT CHIT':type==='AUCTION'?'AUCTION':'FIXED DRAW'}</Badge></View><Text style={s.muted}>Scheduled date: {m.date}</Text><Text>Members: {nMembers}</Text><Text>Installment: {money(m.amount)} / member</Text>{m.agent?<><Text style={s.success}>Agent payout: {money(Number(face))} (full chit amount)</Text><Text style={s.muted}>No draw / no bid.</Text></>:type==='FIXED_DRAW'?<Input label={`Winner payout — Month ${m.number}`} value={fixedPayouts[i]||''} onChangeText={v=>setFixedPayouts(p=>p.map((x,j)=>j===i?v:x))} keyboardType="decimal-pad"/>:<Text style={s.muted}>Auction payout is calculated from the winning discount.</Text>}</Card>)}</Card>
   <Button title="Create Draft Chit" onPress={submit} disabled={busy}/>
  </ScrollView>
 </Screen>
}
