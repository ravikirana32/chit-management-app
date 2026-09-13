import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{chitsApi,collectionsApi,agentApi,paymentsApi,participantsApi}from'@/src/api/all';
import{Button,Card,Input,Loading,Screen,s,Badge}from'@/src/components/UI';
import{date,errMsg,money}from'@/src/lib/format';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isCreator,isAgent,hasCapability}from'@/src/state/roles';

const CLOSED=new Set(['COMPLETED','LOCKED','CLOSED','CANCELLED']);

export default function Collections(){
 const{chitId}=useLocalSearchParams<{chitId:string}>();
 const{user}=useAuth();
 const[chit,setChit]=useState<any>();
 const[access,setAccess]=useState<any>();
 const[overdue,setOverdue]=useState<any[]>([]);
 const[participants,setParticipants]=useState<any[]>([]);
 const[obligations,setObligations]=useState<any[]>([]);
 const[payments,setPayments]=useState<any[]>([]);
 const[busy,setBusy]=useState(false);
 const[cashAmounts,setCashAmounts]=useState<Record<string,string>>({});
 const[cashRefs,setCashRefs]=useState<Record<string,string>>({});

 const load=useCallback(async()=>{
  if(!chitId)return;
  try{
   const c=await chitsApi.get(String(chitId));
   const d=c.data?.data??c.data;
   setChit(d);
   if(isAgent(user)&&!isCreator(user,d)){
    try{const a=await agentApi.chit(String(chitId));setAccess(a.data?.data??a.data)}catch{setAccess(undefined)}
   }
   try{const p=await participantsApi.list(String(chitId));setParticipants(p.data?.data?.participants??p.data?.data??p.data??[])}catch{setParticipants([])}
   try{const r=await collectionsApi.overdue(String(chitId));setOverdue(r.data?.data??r.data??[])}catch{setOverdue([])}

   const months=[...(d.months||[])].sort((a:any,b:any)=>Number(a.month_number)-Number(b.month_number));
   const open=months.find((m:any)=>!CLOSED.has(String(m.status||'').toUpperCase()));
   if(open){
    try{
     const[o,p]=await Promise.all([
      paymentsApi.obligations(String(chitId),String(open.id)),
      paymentsApi.list(String(chitId),String(open.id))
     ]);
     setObligations(o.data?.data?.obligations??[]);
     setPayments(p.data?.data?.payments??[]);
    }catch{setObligations([]);setPayments([])}
   }else{setObligations([]);setPayments([])}
  }catch(e){Alert.alert('Unable to load',errMsg(e))}
 },[chitId,user?.id]);

 useEffect(()=>{load()},[load]);

 const allowed=!!chit&&(isAdmin(user)||isCreator(user,chit)||hasCapability(user,chit,'can_collect_cash',access)||hasCapability(user,chit,'can_verify_payments',access));
 const canCash=isAdmin(user)||isCreator(user,chit)||hasCapability(user,chit,'can_collect_cash',access);
 const canVerify=isAdmin(user)||isCreator(user,chit)||hasCapability(user,chit,'can_verify_payments',access);

 const currentMonth=useMemo(()=>[...(chit?.months||[])].sort((a:any,b:any)=>Number(a.month_number)-Number(b.month_number)).find((m:any)=>!CLOSED.has(String(m.status||'').toUpperCase())),[chit]);
 const participantName=(id:string,seq:any)=>{
  const p=participants.find((x:any)=>String(x.id??x.participantId)===String(id));
  return p?.user?.name||p?.name||p?.member_name||`Member ${seq??'—'}`;
 };
 const recordCash=async(o:any)=>{
  const amount=Number(cashAmounts[o.id]||o.outstandingAmount);
  if(!Number.isFinite(amount)||amount<=0||amount>Number(o.outstandingAmount))return Alert.alert('Invalid amount',`Outstanding amount is ${money(o.outstandingAmount)}.`);
  if(!cashRefs[o.id]?.trim())return Alert.alert('Reference required','Enter a cash receipt/reference number.');
  setBusy(true);
  try{
   await paymentsApi.recordCash(String(o.id),{method:'CASH',amount:amount.toFixed(2),transactionReference:cashRefs[o.id].trim(),cashReceiptNote:`Cash collected for Month ${currentMonth?.month_number||''}`});
   Alert.alert('Cash recorded','The contribution has been recorded as verified cash.');
   setCashAmounts(x=>({...x,[o.id]:''}));setCashRefs(x=>({...x,[o.id]:''}));
   await load();
  }catch(e){Alert.alert('Cash collection failed',errMsg(e))}finally{setBusy(false)}
 };
 const verify=async(p:any)=>{
  setBusy(true);
  try{await paymentsApi.verify(String(p.id),{status:'VERIFIED'});await load()}
  catch(e){Alert.alert('Verification failed',errMsg(e))}
  finally{setBusy(false)}
 };

 if(!chit)return <Screen title="Collections" back={()=>router.back()}><Loading/></Screen>;
 if(!allowed)return <Screen title="Access denied" subtitle="Creator/admin or assigned collection/verification operator only" back={()=>router.back()}/>;

 return <Screen title="Collections" subtitle={String(chit.name)} back={()=>router.back()}><ScrollView>
  <Card>
   <Text style={s.section}>Collection workflow</Text>
   <Text style={s.muted}>The current open month is shown here. Record received cash against the authoritative obligation, verify submitted payments, then use reconciliation and month close after the month is complete.</Text>
  </Card>

  {currentMonth?
   <Card>
    <View style={s.row}><Text style={{fontWeight:'900',flex:1}}>Month {currentMonth.month_number}</Text><Badge tone={CLOSED.has(String(currentMonth.status||'').toUpperCase())?'green':'orange'}>{String(currentMonth.status||'SCHEDULED')}</Badge></View>
    <Text style={s.muted}>{date(currentMonth.scheduled_date)} · {money(currentMonth.scheduled_amount)} / member</Text>
    <Text style={s.muted}>Expected collection: {money(Number(currentMonth.scheduled_amount||0)*Number(chit.total_members||0))}</Text>
   </Card>
  :<Card><Text style={s.section}>No open month</Text><Text style={s.muted}>All months are completed or locked. Historical collection data remains viewable from the month details.</Text></Card>}

  {currentMonth&&<Card>
   <Text style={s.section}>Member obligations</Text>
   {obligations.length===0&&<Text style={s.muted}>No obligations are available for the current open month yet.</Text>}
   {obligations.map((o:any)=>(
    <Card key={String(o.id)}>
     <View style={s.row}><Text style={{fontWeight:'900',flex:1}}>{participantName(o.chitParticipantId,o.participantSequence)}</Text><Badge tone={Number(o.outstandingAmount)>0?'orange':'green'}>{String(o.status||'PENDING')}</Badge></View>
     <Text>Due {money(o.dueAmount)} · Paid {money(o.paidAmount)} · Outstanding {money(o.outstandingAmount)}</Text>
     {canCash&&Number(o.outstandingAmount)>0&&<><Input label="Cash amount" value={cashAmounts[o.id]||''} onChangeText={v=>setCashAmounts(x=>({...x,[o.id]:v}))} placeholder={String(o.outstandingAmount)} keyboardType="decimal-pad"/><Input label="Cash receipt / reference" value={cashRefs[o.id]||''} onChangeText={v=>setCashRefs(x=>({...x,[o.id]:v}))} placeholder="CASH-001" autoCapitalize="characters"/><Button title="Record Cash" onPress={()=>recordCash(o)} disabled={busy}/></>}
    </Card>
   ))}
  </Card>}

  {canVerify&&<Card>
   <Text style={s.section}>Submitted payments</Text>
   {payments.length===0&&<Text style={s.muted}>No submitted payments for the current open month.</Text>}
   {payments.map((p:any)=>(
    <Card key={String(p.id)}>
     <Text style={{fontWeight:'900'}}>Member {String(p.participantSequence||p.participant_sequence||'—')}</Text>
     <Text>{money(p.amount)} · {String(p.paymentMethod||p.payment_method||'')} · {String(p.transactionReference||p.transaction_reference||'—')}</Text>
     <Badge tone={String(p.status).toUpperCase()==='VERIFIED'?'green':'orange'}>{String(p.status||'UNKNOWN')}</Badge>
     {String(p.status).toUpperCase()!=='VERIFIED'&&<Button title="Verify Payment" onPress={()=>verify(p)} disabled={busy}/>}
    </Card>
   ))}
  </Card>}

  <Card>
   <Text style={s.section}>Overdue / exceptions</Text>
   {overdue.length===0?<Text style={s.muted}>No overdue or defaulted obligations.</Text>:overdue.map((x:any,i)=><Card key={String(x.id||i)}><Text style={{fontWeight:'800'}}>{x.userName||x.name||`Obligation ${i+1}`}</Text><Text>Outstanding {money(x.outstandingAmount??x.outstanding_amount)}</Text><Badge tone="red">OVERDUE</Badge></Card>)}
  </Card>

  <Button title="Refresh Collections" secondary onPress={load} disabled={busy}/>
  <Button title="Back to Chit" secondary onPress={()=>router.replace({pathname:'/chit-detail',params:{chitId:String(chitId)}})}/>
 </ScrollView></Screen>
}
