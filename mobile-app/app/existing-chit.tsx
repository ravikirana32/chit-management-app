import React,{useEffect,useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router}from'expo-router';
import{chitsApi,runningChitApi,usersApi}from'@/src/api/all';
import{Button,Card,Input,Screen,Select,s,Badge,Loading}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isAgent}from'@/src/state/roles';
import{errMsg,money}from'@/src/lib/format';

const n=(v:any,d=0)=>{const x=Number(v);return Number.isFinite(x)?x:d};

export default function ExistingChit(){
 const{user}=useAuth();
 const[phase,setPhase]=useState<'create'|'history'>('create');
 const[busy,setBusy]=useState(false);const[loadingAgents,setLoadingAgents]=useState(false);
 const[created,setCreated]=useState<any>(null);const[monthIndex,setMonthIndex]=useState(1);
 const[agents,setAgents]=useState<any[]>([]);
 const[name,setName]=useState('');const[description,setDescription]=useState('');const[type,setType]=useState<'FIXED_DRAW'|'AUCTION'>('FIXED_DRAW');
 const[membersText,setMembersText]=useState('4');const[totalMonthsText,setTotalMonthsText]=useState('6');const[historicalCountText,setHistoricalCountText]=useState('2');
 const members=Math.max(0,Math.floor(n(membersText,0)));const totalMonths=Math.max(0,Math.floor(n(totalMonthsText,0)));const historicalCount=Math.max(0,Math.floor(n(historicalCountText,0)));
 const[totalAmount,setTotalAmount]=useState('20000');const[startDate,setStartDate]=useState(new Date().toISOString().slice(0,10));const[dueDay,setDueDay]=useState('5');
 const[agentId,setAgentId]=useState('');const[creatorParticipates,setCreatorParticipates]=useState(false);
 const[memberInputs,setMemberInputs]=useState<string[]>(['','','','']);
 const[agentMonths,setAgentMonths]=useState<number[]>([]);const[agentPayouts,setAgentPayouts]=useState<Record<number,string>>({});
 const[monthDate,setMonthDate]=useState('');const[winner,setWinner]=useState('');const[fixedPayout,setFixedPayout]=useState('');const[discount,setDiscount]=useState('');const[notes,setNotes]=useState('');
 const face=n(totalAmount);const installment=members>0?face/members:0;
 const isAdminUser=isAdmin(user);const isAgentUser=isAgent(user);

 const loadAgents=async()=>{
  if(!isAdminUser)return;
  setLoadingAgents(true);
  try{const r=await usersApi.adminAgents();setAgents(Array.isArray(r.data?.data)?r.data.data:(Array.isArray(r.data)?r.data:[]));}
  catch(e){Alert.alert('Unable to load agents',errMsg(e));}
  finally{setLoadingAgents(false)}
 };
 useEffect(()=>{if(isAdminUser)loadAgents()},[isAdminUser]);

 useEffect(()=>{
  setMemberInputs(prev=>Array.from({length:members},(_,i)=>prev[i]||''));
 },[members]);

 const monthOptions=useMemo(()=>Array.from({length:Math.max(0,totalMonths)},(_,i)=>i+1),[totalMonths]);
 const agentOptions=agents.filter(a=>String(a.status||'ACTIVE').toUpperCase()==='ACTIVE').map(a=>({label:`${a.name||'Agent'} · ${a.mobile||a.userId||a.id}`,value:String(a.id)}));
 const selectedAgent=agents.find(a=>String(a.id)===String(agentId));
 const toggleAgentMonth=(m:number)=>{
  setAgentMonths(prev=>{
   if(prev.includes(m)){setAgentPayouts({});return [];}
   const previous=prev[0];
   setAgentPayouts(current=>({[m]:previous&&current[previous]?current[previous]:(face>0?face.toFixed(2):'')}));
   return [m];
  });
 };
 const payoutForMonth=(m:number)=>n(agentPayouts[m],face);

 const create=async()=>{
  if(!name.trim())return Alert.alert('Chit name required');
  if(members<2||totalMonths<2)return Alert.alert('Members and total months must be at least 2');
  if(historicalCount<1||historicalCount>=totalMonths)return Alert.alert('Completed months must be between 1 and total months - 1');
  if(!face||face<=0)return Alert.alert('Total chit amount must be positive');
  if(!startDate.match(/^\d{4}-\d{2}-\d{2}$/))return Alert.alert('Enter original start date as YYYY-MM-DD');
  const memberRows=memberInputs.slice(0,members).map(v=>v.trim()).filter(Boolean);
  if(memberRows.length!==members)return Alert.alert(`Enter all ${members} existing member UUID/mobile values`);
  if(new Set(memberRows).size!==memberRows.length)return Alert.alert('Duplicate members are not allowed');
  if(agentMonths.length&&!agentId&&!isAgentUser)return Alert.alert('Select the responsible agent before marking AGENT_CHIT months');
  if(agentMonths.length>1)return Alert.alert('Only one AGENT_CHIT month can be configured per chit');
  const payoutAmounts=Array.from({length:totalMonths},(_,i)=>agentMonths.includes(i+1)?payoutForMonth(i+1):undefined);
  if(agentMonths.some(m=>payoutForMonth(m)<=0))return Alert.alert('Every AGENT_CHIT month needs a positive agent payout');
  setBusy(true);
  try{
   const r=await runningChitApi.create({name:name.trim(),description:description.trim()||undefined,chitType:type,totalMembers:members,totalMonths,historicalMonthCount:historicalCount,originalStartDate:startDate,dueDay:n(dueDay,5),totalChitAmount:face.toFixed(2),creatorParticipates,agentId:agentId||undefined,members:memberRows.map((v,i)=>v.includes('-')?{userId:v,sequence:i+1}:{mobile:v,sequence:i+1}),agentMonthNumbers:agentMonths,payoutAmounts:payoutAmounts.map(v=>v==null?'':String(v))});
   const d=r.data?.data??r.data;setCreated(d);setMonthIndex(1);setMonthDate(d?.months?.[0]?.scheduled_date||startDate);setFixedPayout(String(d?.months?.[0]?.winner_payout_amount??face));setDiscount('');setWinner('');setNotes('');setPhase('history');
  }catch(e){Alert.alert('Create failed',errMsg(e))}finally{setBusy(false)}
 };

 const finalize=async()=>{
  if(!created?.id)return;
  if(!monthDate.match(/^\d{4}-\d{2}-\d{2}$/))return Alert.alert('Enter month date as YYYY-MM-DD');
  const month=created.months?.find((m:any)=>Number(m.month_number)===monthIndex);
  const monthType=String(month?.month_type||'ACTION').toUpperCase();
  const agentMonth=monthType==='AGENT_CHIT';
  const payout=agentMonth?payoutForMonth(monthIndex):n(fixedPayout,0);
  if(monthType==='FIXED_DRAW'&&payout<=0)return Alert.alert('Enter the actual Fixed Draw payout for this historical month');
  if(agentMonth&&payout<=0)return Alert.alert('Enter the Agent Chit payout for this historical month');
  if(type==='AUCTION'&&n(discount,0)<0)return Alert.alert('Auction discount cannot be negative');
  if(!agentMonth&&!winner.trim())return Alert.alert(`${type==='AUCTION'?'Auction':'Fixed Draw'} historical month requires a winner`);
  const payRows=memberInputs.slice(0,members).map((v,i)=>({memberId:v.trim(),amount:installment.toFixed(2),method:'CASH',paymentDate:monthDate}));
  if(payRows.some(x=>!x.memberId))return Alert.alert('All member values are required');
  setBusy(true);
  try{
   await runningChitApi.finalize(String(created.id),String(monthIndex),{
    contributionPerMember:installment.toFixed(2),completedAt:monthDate,openingSavings:'0',collectedAmount:(installment*members).toFixed(2),
    winnerMemberId:agentMonth?undefined:winner.trim(),payoutAmount:payout.toFixed(2),discountAmount:type==='AUCTION'?n(discount,0).toFixed(2):'0',notes:notes.trim()||undefined,
    payoutComponents:[{amount:payout.toFixed(2),method:'CASH'}],payments:payRows
   });
   if(monthIndex<historicalCount){const next=monthIndex+1;setMonthIndex(next);const nm=created.months?.find((m:any)=>Number(m.month_number)===next);setMonthDate(nm?.scheduled_date||startDate);setFixedPayout(String(nm?.winner_payout_amount??face));setDiscount('');setWinner('');setNotes('');}
   else{await runningChitApi.activate(String(created.id),String(historicalCount+1));Alert.alert('Running chit activated',`Month ${historicalCount+1} is now the live takeover month.`);router.replace({pathname:'/chit-detail',params:{chitId:String(created.id)}})}
  }catch(e){Alert.alert('Finalize failed',errMsg(e))}finally{setBusy(false)}
 };

 if(phase==='create')return <Screen title="Running Chit Onboarding" subtitle="Create a chit that already started outside the app" back={()=>router.back()}>
  <ScrollView>
   <Card><Text style={s.section}>1 · Running chit basics</Text><Text style={s.muted}>Only historical outcome data is entered later. Collections, savings and payout accounting are calculated by the backend.</Text>
    <Input label="Chit name" value={name} onChangeText={setName}/><Input label="Description" value={description} onChangeText={setDescription} multiline/>
    <View style={s.row}><Button title="FIXED DRAW" secondary={type!=='FIXED_DRAW'} onPress={()=>setType('FIXED_DRAW')}/><Button title="AUCTION" secondary={type!=='AUCTION'} onPress={()=>setType('AUCTION')}/></View>
    <View style={s.row}><View style={{flex:1}}><Input label="Members" value={membersText} onChangeText={setMembersText} keyboardType="numeric"/></View><View style={{flex:1}}><Input label="Total months" value={totalMonthsText} onChangeText={setTotalMonthsText} keyboardType="numeric"/></View></View>
    <Input label="Completed months outside the app" value={historicalCountText} onChangeText={setHistoricalCountText} keyboardType="numeric"/>
    <Text style={s.muted}>{historicalCount>0&&totalMonths>0?`Example: ${historicalCount} completed months means Month ${historicalCount+1} becomes the LIVE takeover month.`:'Enter the completed-month count freely. It must be at least 1 and less than total months.'}</Text>
    <Input label="Total chit amount" value={totalAmount} onChangeText={setTotalAmount} keyboardType="decimal-pad"/>
    <Input label="Original start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate}/><Input label="Due day" value={dueDay} onChangeText={setDueDay} keyboardType="numeric"/>
    <Card><Text style={s.section}>Backend historical defaults</Text><Text style={s.muted}>{`Contribution: ${money(installment)} per member/month`}</Text><Text style={s.muted}>Historical payment: CASH</Text><Text style={s.muted}>Historical payment date: month date</Text><Text style={s.muted}>Historical payout settlement: CASH</Text></Card>
    {isAdminUser?<Select label={loadingAgents?'Responsible agent (loading…)':'Responsible agent'} value={agentId} options={agentOptions} onChange={setAgentId} placeholder={loadingAgents?'Loading agents…':'Select responsible agent'}/>:<Text style={s.muted}>Responsible agent: logged-in agent is automatically resolved when you are an AGENT.</Text>}
    <Text style={s.section}>AGENT_CHIT month</Text><Text style={s.muted}>At most one month per chit can be an Agent Chit. Select that month and configure its agent payout. It defaults to the total chit amount but can be changed.</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8}}>{monthOptions.map(m=><Button key={m} title={`Month ${m}${agentMonths.includes(m)?' ✓':''}`} secondary={!agentMonths.includes(m)} onPress={()=>toggleAgentMonth(m)}/>)}</View>
    {agentMonths.map(m=><Input key={m} label={`Agent payout · Month ${m}`} value={agentPayouts[m]||''} onChangeText={v=>setAgentPayouts(p=>({...p,[m]:v}))} keyboardType="decimal-pad"/>) }
    <Text style={s.muted}>{selectedAgent?`Responsible agent: ${selectedAgent.name}`:agentMonths.length&&!isAgentUser?'Select an agent before creating AGENT_CHIT months.':''}</Text>
   </Card>
   <Card><Text style={s.section}>2 · Existing members</Text><Text style={s.muted}>Enter each existing application user's UUID or mobile number. No invitation or live payment workflow is triggered.</Text>{memberInputs.slice(0,members).map((v,i)=><Input key={i} label={`Member ${i+1}`} value={v} onChangeText={x=>setMemberInputs(p=>p.map((q,j)=>j===i?x:q))} placeholder="User UUID or mobile"/>)}</Card>
   <Button title="Create Running Chit & Generate Schedule" onPress={create} disabled={busy}/>
  </ScrollView>
 </Screen>;

 const currentMonth=created?.months?.find((m:any)=>Number(m.month_number)===monthIndex);const currentType=String(currentMonth?.month_type||'ACTION').toUpperCase();const agentHistorical=currentType==='AGENT_CHIT';
 return <Screen title="Running Chit Onboarding" subtitle={`Historical Month ${monthIndex} · ${Math.max(0,monthIndex-1)}/${historicalCount} historical months locked`} back={()=>router.back()}>
  <ScrollView>
   <Card><Text style={s.section}>Historical onboarding</Text><Text style={s.muted}>{`Chit ID: ${created?.id||'—'}`}</Text><Text style={s.muted}>{`Total members: ${members}`}</Text><Text style={s.muted}>{`Total months: ${totalMonths}`}</Text><Text style={s.muted}>{`Historical months: ${historicalCount}`}</Text><Text style={s.muted}>{`${Math.max(0,monthIndex-1)}/${historicalCount} historical months locked. Historical months are direct-entry history and remain locked after finalization.`}</Text></Card>
   <Card><View style={s.row}><Text style={s.section}>Historical Month {monthIndex}</Text><Badge tone={agentHistorical?'green':'purple'}>{agentHistorical?'AGENT CHIT':'HISTORICAL'}</Badge></View><Text style={s.muted}>Enter only what actually happened. Collection, savings and payout totals are calculated by the backend.</Text>
    <Input label="Month date (YYYY-MM-DD)" value={monthDate} onChangeText={setMonthDate}/>
    {!agentHistorical&&<Input label="Winner UUID/mobile" value={winner} onChangeText={setWinner} placeholder="Existing member"/>}
    {type==='FIXED_DRAW'&&!agentHistorical&&<Input label="Fixed Draw payout (actual historical payout)" value={fixedPayout} onChangeText={setFixedPayout} keyboardType="decimal-pad"/>}
    {agentHistorical&&<Card><Text style={s.section}>Configured Agent Chit payout</Text><Text style={s.success}>{money(payoutForMonth(monthIndex))}</Text><Text style={s.muted}>This amount was decided in the initial onboarding configuration and is carried into the historical month. Change it in the initial AGENT_CHIT month configuration before creating the running chit.</Text></Card>}
    {type==='AUCTION'&&!agentHistorical&&<Input label="Auction discount" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad"/>}
    <Card><Text style={s.section}>{agentHistorical?'Agent Chit payout':'Historical payout'}</Text><Text style={s.success}>{money(agentHistorical?payoutForMonth(monthIndex):type==='AUCTION'?face-n(discount,0):n(fixedPayout,0))}</Text><Text style={s.muted}>{agentHistorical?'No draw / no auction. Agent receives the configured monthly payout.':type==='AUCTION'?'Payout is derived as total chit amount minus auction discount.':'Fixed Draw payout is the actual historical monthly payout entered for this month.'}</Text></Card>
    <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline/>
    <Card><Text style={s.section}>Automatic historical accounting</Text><Text style={s.muted}>{`${members} members × ${money(installment)} = ${money(installment*members)} collection`}</Text><Text style={s.muted}>Payment method: CASH</Text><Text style={s.muted}>{`Payment date: ${monthDate}`}</Text><Text style={s.muted}>Payout method: CASH</Text></Card>
    <Button title={`Finalize & Lock Historical Month ${monthIndex}`} onPress={finalize} disabled={busy}/>
   </Card>
  </ScrollView>
 </Screen>;
}
