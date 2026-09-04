import React,{useCallback,useEffect,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{drawsApi,chitsApi,agentApi,participantsApi,payoutsApi}from'@/src/api/all';
import{Badge,Button,Card,Input,Loading,Screen,s}from'@/src/components/UI';
import{errMsg,money}from'@/src/lib/format';
import{useAuth}from'@/src/state/Auth';
import{isCreator,isMember,canOperate,isAgent,hasCapability,isAdmin}from'@/src/state/roles';
import WinnerReveal from'@/src/components/WinnerReveal';

export default function FixedDraw(){
 const{chitId,monthId}=useLocalSearchParams<{chitId:string;monthId:string}>();
 const{user}=useAuth(); const[state,setState]=useState<any>(); const[chit,setChit]=useState<any>();
 const[access,setAccess]=useState<any>(); const[payout,setPayout]=useState<any>(null);
 const[loading,setLoading]=useState(true); const[busy,setBusy]=useState(false); const[settling,setSettling]=useState(false);
 const[method,setMethod]=useState('CASH'); const[reference,setReference]=useState(''); const[error,setError]=useState('');
 const load=useCallback(async()=>{
  setError('');
  try{
   const c=await chitsApi.get(String(chitId)); const cd=c.data?.data??c.data; setChit(cd);
   await participantsApi.list(String(chitId));
   try{const d=await drawsApi.get(String(chitId),String(monthId));const ds=d.data?.data??d.data;setState(ds);if(ds?.winner?.payout_id)setPayout({id:ds.winner.payout_id,status:ds.winner.payout_status||'PENDING',amount:ds.winner.payout_amount,recipient_name:ds.winner.member_name,recipient_mobile:ds.winner.member_mobile,payment_method:ds.winner.payment_method,transaction_reference:ds.winner.transaction_reference,paid_at:ds.winner.paid_at,notes:'FIXED_DRAW:'})}
   catch{setState({status:'NOT_STARTED',revealStatus:'NONE',participants:[],winner:null})}
   try{const ps=await payoutsApi.list(String(chitId));const rows=ps.data?.data??ps.data??[];
    const fixed=rows.find((x:any)=>String(x.chit_month_id??x.chitMonthId)===String(monthId)&&String(x.notes||'').startsWith('FIXED_DRAW:'));
    setPayout(fixed??null);
   }catch{setPayout(null)}
   if(isAgent(user)&&!isCreator(user,cd)){try{const a=await agentApi.chit(String(chitId));setAccess(a.data?.data??a.data)}catch{}}
  }catch(e){setError(errMsg(e))}finally{setLoading(false)}
 },[chitId,monthId,user?.id]);
 useEffect(()=>{load()},[load]);
 if(loading)return <Screen title="Fixed Draw" back={()=>router.back()}><Loading/></Screen>;
 if(error)return <Screen title="Fixed Draw" back={()=>router.back()}><Card><Text style={s.danger}>{error}</Text><Button title="Retry" onPress={load}/></Card></Screen>;
 if(!state||!chit)return <Screen title="Fixed Draw" back={()=>router.back()}><Card><Text>No draw data is available.</Text></Card></Screen>;
 const operate=canOperate(user,chit,'can_run_draw',access);
 const settleAllowed=isAdmin(user)||isCreator(user,chit)||hasCapability(user,chit,'can_settle_payout',access);
 const month=chit.months?.find((m:any)=>String(m.id)===String(monthId));
 const revealStatus=String(state.revealStatus??state.reveal_status??'NONE').toUpperCase();
 const revealActive=revealStatus==='REVEALING'; const completed=revealStatus==='REVEALED'; const winnerSelected=Boolean(state?.winner); const drawCompleted=String(state?.status||'').toUpperCase()==='COMPLETED'; const payoutReady=Boolean(payout); const payoutVisible=Boolean(payoutReady&&(completed||winnerSelected||drawCompleted));
 const interest=async(v:boolean)=>{setBusy(true);try{await drawsApi.interest(String(chitId),String(monthId),v);await load()}catch(e){Alert.alert('Interest failed',errMsg(e))}finally{setBusy(false)}};
 const start=async()=>{setBusy(true);try{await drawsApi.start(String(chitId),{chitMonthId:String(monthId)});await load()}catch(e){Alert.alert('Start failed',errMsg(e))}finally{setBusy(false)}};
 const run=async()=>{setBusy(true);try{await drawsApi.run(String(chitId),String(monthId));await load()}catch(e){Alert.alert('Run failed',errMsg(e))}finally{setBusy(false)}};
 const settle=async()=>{if(!payout?.id)return;if(!reference.trim())return Alert.alert('Reference required','Enter the UPI transaction ID, bank reference, or cash receipt number.');setSettling(true);try{await payoutsApi.settle(String(payout.id),{status:'SETTLED',paymentMethod:method,transactionReference:reference.trim(),notes:'Winner payout settled from Fixed Draw'});Alert.alert('Payout settled','Winner payout has been recorded. The month can now be closed and locked.');await load()}catch(e){Alert.alert('Payout settlement failed',errMsg(e))}finally{setSettling(false)}};
 return <Screen title="Fixed Draw" subtitle="Interest → secure selection → winner reveal" back={()=>router.back()}><ScrollView>
  <Card><Text style={s.section}>Month {month?.month_number||'—'}</Text><Text style={{fontSize:24,fontWeight:'900'}}>{money(month?.winner_payout_amount??month?.scheduled_amount)}</Text><Text style={s.muted}>Previous winners are excluded. If nobody expresses interest, all eligible members are considered.</Text><Badge tone={completed?'green':revealActive?'purple':'orange'}>{completed?'WINNER REVEALED':revealActive?'REVEALING':state.status||'NOT STARTED'}</Badge></Card>
  <WinnerReveal kind="DRAW" id={String(state.id||state.drawId||'')} state={state} reload={load} payoutAmount={Number(month?.winner_payout_amount||month?.scheduled_amount||0)}/>
  {payoutVisible&&payout&&<Card><Text style={s.section}>Winner payout</Text><View style={s.row}><Text style={{flex:1,fontWeight:'800'}}>Amount</Text><Text style={{fontSize:22,fontWeight:'900'}}>{money(payout.amount)}</Text></View><View style={s.row}><Text style={{flex:1,fontWeight:'800'}}>Status</Text><Badge tone={payout.status==='SETTLED'?'green':'orange'}>{payout.status}</Badge></View>{payout.recipient_name&&<Text style={s.muted}>Winner: {payout.recipient_name}</Text>}
   {payout.status!=='SETTLED'&&settleAllowed&&<><Text style={s.muted}>Record the actual winner payment to clear the pending payout and enable month close.</Text><Input label="Transaction / receipt reference" value={reference} onChangeText={setReference} placeholder="UPI-123 / CASH-001"/><View style={s.row}>{['CASH','UPI','BANK_TRANSFER'].map(x=><Button key={x} title={x} secondary={method!==x} onPress={()=>setMethod(x)} disabled={settling}/>)}</View><Button title="Settle winner payout" onPress={settle} disabled={settling}/></>}
   {payout.status==='SETTLED'&&<Text style={s.success}>✓ Winner payout settled. You can now close and lock the month.</Text>}
  </Card>}
  {!revealActive&&!completed&&!drawCompleted&&operate&&<Button title="Open / Restart Interest Window" onPress={start} disabled={busy}/>}
  {!revealActive&&!completed&&!drawCompleted&&isMember(user)&&<Card><Text style={s.section}>My interest</Text><Text style={s.muted}>Express interest to participate in this month's draw.</Text><View style={s.row}><View style={{flex:1}}><Button title="Interested" onPress={()=>interest(true)} disabled={busy}/></View><View style={{flex:1}}><Button title="Not interested" secondary onPress={()=>interest(false)} disabled={busy}/></View></View></Card>}
  {state.participants?.length>0&&<Card><Text style={s.section}>Eligible members</Text>{state.participants.map((p:any)=><Text key={p.id} style={{paddingVertical:6}}>{p.participant_sequence||p.participantSequence} · {p.interest_status||p.interestStatus}</Text>)}</Card>}
  {!revealActive&&!completed&&!drawCompleted&&operate&&<Button title="Run Draw Now" onPress={run} disabled={busy}/>}
 </ScrollView></Screen>;
}
