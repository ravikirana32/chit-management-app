import React,{useEffect,useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router}from'expo-router';
import{chitsApi,usersApi}from'@/src/api/all';
import{Button,Card,Input,Screen,Select,s,Badge}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isAgent}from'@/src/state/roles';
import{errMsg}from'@/src/lib/format';

const money=(n:number)=>`₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function CreateChit(){
 const{user}=useAuth();
 const[agents,setAgents]=useState<any[]>([]);
 const[name,setName]=useState('');
 const[description,setDescription]=useState('');
 const[type,setType]=useState('FIXED_DRAW');
 const[members,setMembers]=useState('5');
 const[months,setMonths]=useState('5');
 const[start,setStart]=useState(new Date().toISOString().slice(0,10));
 const[due,setDue]=useState('5');
 const[creatorParticipates,setCreatorParticipates]=useState(false);
 const[face,setFace]=useState('25000');
 const[agentMonths,setAgentMonths]=useState<number[]>([]);
 const[agentId,setAgentId]=useState('');
 const[payouts,setPayouts]=useState<string[]>([]);
 const[busy,setBusy]=useState(false);
 const nMembers=Math.max(2,Number(members)||2);
 const nMonths=Math.max(2,Number(months)||2);
 const faceAmount=Number(face)||0;
 const monthlyInstallment=faceAmount>0?faceAmount/nMembers:0;

 useEffect(()=>{
   setPayouts(prev=>Array.from({length:nMonths},(_,i)=>{
     if(agentMonths.includes(i+1))return String(faceAmount);
     return prev[i]??String(Math.round(monthlyInstallment));
   }));
 },[nMonths,faceAmount,monthlyInstallment,agentMonths]);

 useEffect(()=>{
   if(isAdmin(user))usersApi.adminAgents().then(r=>setAgents((r.data?.data??[]).filter((a:any)=>String(a.status||'').toUpperCase()==='ACTIVE'))).catch(()=>{});
   setAgentId('');
 },[user]);

 const agentOptions=useMemo(()=>agents.map(a=>({label:`${a.name||'Agent'} · ${a.mobile||a.phone||''}`,value:String(a.id)})),[agents]);
 const toggleAgentMonth=(m:number)=>setAgentMonths(prev=>prev.includes(m)?prev.filter(x=>x!==m):[...prev,m].sort((a,b)=>a-b));
 const updatePayout=(index:number,value:string)=>setPayouts(prev=>prev.map((x,i)=>i===index?value:x));

 const submit=async()=>{
   if(!name.trim())return Alert.alert('Name required');
   if(nMembers<2)return Alert.alert('Members','At least 2 members are required');
   if(nMonths<2)return Alert.alert('Months','At least 2 months are required');
   if(faceAmount<=0)return Alert.alert('Chit amount','Enter a valid total chit amount');
   if(isAdmin(user)&&agentMonths.length&&!agentId)return Alert.alert('Agent required','Select an active agent for AGENT_CHIT months');
   let fixedPayouts:string[]=[];
   if(type==='FIXED_DRAW'){
     for(let i=0;i<nMonths;i++){
       if(agentMonths.includes(i+1)){fixedPayouts.push(faceAmount.toFixed(2));continue;}
       const p=Number(payouts[i]);
       if(!Number.isFinite(p)||p<=0)return Alert.alert('Invalid payout',`Enter a valid payout for Month ${i+1}`);
       fixedPayouts.push(p.toFixed(2));
     }
   }else fixedPayouts=Array(nMonths).fill(monthlyInstallment.toFixed(2));
   setBusy(true);
   try{
     const payload:any={
       name:name.trim(),description:description.trim()||undefined,chitType:type,
       totalMembers:nMembers,totalMonths:nMonths,startDate:start,dueDay:Number(due),
       creatorParticipates,monthlyAmounts:Array(nMonths).fill(monthlyInstallment.toFixed(2)),
       totalChitAmount:faceAmount.toFixed(2),agentMonthNumbers:agentMonths,
       agentId:isAdmin(user)?(agentId||undefined):undefined,
       fixedDrawPayoutAmounts:fixedPayouts,
     };
     const r=await chitsApi.create(payload);const d=r.data?.data??r.data;
     Alert.alert('Chit created',`Draft created successfully.`,[{text:'Open setup',onPress:()=>router.replace({pathname:'/chit-setup',params:{chitId:String(d.id)}})}]);
   }catch(e){Alert.alert('Create failed',errMsg(e))}finally{setBusy(false)}
 };

 return <Screen title="Create Chit" subtitle={isAdmin(user)?'ADMIN: select the agent responsible for this chit':isAgent(user)?'AGENT: logged-in agent is assigned automatically':'Creator'} back={()=>router.back()}>
  <ScrollView keyboardShouldPersistTaps="handled">
   <Card>
    <Text style={s.section}>Basic chit details</Text>
    <Input label="Chit name" value={name} onChangeText={setName} placeholder="My Chit"/>
    <Input label="Description" value={description} onChangeText={setDescription} placeholder="Optional" multiline/>
    <Select label="Chit type" value={type} options={[{label:'Fixed Draw',value:'FIXED_DRAW'},{label:'Auction',value:'AUCTION'}]} onChange={setType}/>
    <View style={s.row}><View style={{flex:1}}><Input label="Number of members" value={members} onChangeText={setMembers} keyboardType="number-pad"/></View><View style={{flex:1}}><Input label="Number of months" value={months} onChangeText={setMonths} keyboardType="number-pad"/></View></View>
    <View style={s.row}><View style={{flex:1}}><Input label="Start date" value={start} onChangeText={setStart}/></View><View style={{flex:1}}><Input label="Due day" value={due} onChangeText={setDue} keyboardType="number-pad"/></View></View>
    <Input label="Total chit amount" value={face} onChangeText={setFace} keyboardType="decimal-pad"/>
    <Card><Text style={{fontWeight:'800'}}>Per-person monthly installment</Text><Text style={{fontSize:24,fontWeight:'900',marginTop:4}}>{money(monthlyInstallment)}</Text><Text style={s.muted}>Automatically calculated: total chit amount ÷ number of members.</Text></Card>
    {isAdmin(user)&&<Select label="Responsible Agent" value={agentId} options={agentOptions} onChange={setAgentId} placeholder="Select active agent"/>}
    {isAgent(user)&&<Card><Text style={{fontWeight:'800'}}>Agent identity</Text><Text style={s.muted}>{String(user?.name||'Logged-in agent')} · assigned automatically</Text><Badge tone="green">Automatic</Badge></Card>}
    <Button title={creatorParticipates?'Creator participates: YES':'Creator participates: NO'} secondary onPress={()=>setCreatorParticipates(v=>!v)}/>
   </Card>

   <Card>
    <Text style={s.section}>1. Select AGENT CHIT months</Text>
    <Text style={s.muted}>Admin: the selected active agent will run these months and receive the full chit amount. Agent creator: the logged-in agent is assigned automatically. These months have no draw/bid.</Text>
    {Array.from({length:nMonths},(_,i)=>{const m=i+1,selected=agentMonths.includes(m);return <Button key={m} title={`Month ${m}: ${selected?'AGENT CHIT':'ACTION'}`} secondary={!selected} onPress={()=>toggleAgentMonth(m)}/>})}
    {agentMonths.length>0&&<Text style={s.muted}>Selected agent: {isAgent(user)?'current logged-in agent (automatic)':agentId?'selected active agent':'not selected'}</Text>}
   </Card>

   <Card>
    <Text style={s.section}>2. Monthly schedule</Text>
    <Text style={s.muted}>Monthly installment is automatic. AGENT CHIT payout is always the total chit amount.</Text>
    {Array.from({length:nMonths},(_,i)=>{const m=i+1,agentMonth=agentMonths.includes(m);return <Card key={m}><View style={s.row}><View style={{flex:1}}><Text style={{fontWeight:'900',fontSize:18}}>Month {m}</Text><Badge tone={agentMonth?'green':'purple'}>{agentMonth?'AGENT CHIT':'ACTION'}</Badge></View><Text style={{fontWeight:'900'}}>{money(monthlyInstallment)} / member</Text></View>{agentMonth?<Card><Text style={{fontWeight:'800'}}>Agent payout</Text><Text style={{fontSize:24,fontWeight:'900'}}>{money(faceAmount)}</Text><Text style={s.muted}>Automatically locked to the total chit amount.</Text></Card>:type==='FIXED_DRAW'?<Input label={`Winner payout — Month ${m}`} value={payouts[i]??''} onChangeText={v=>updatePayout(i,v)} keyboardType="decimal-pad"/>:<Text style={s.muted}>Auction month — winner payout is determined by the auction.</Text>}</Card>})}
   </Card>
   <Button title="Create Draft Chit" onPress={submit} disabled={busy}/>
  </ScrollView>
 </Screen>
}
