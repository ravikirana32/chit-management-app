import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{paymentsApi,chitsApi,agentApi}from'@/src/api/all';
import{Badge,Button,Card,Input,Loading,Screen,s}from'@/src/components/UI';
import{date,errMsg,idempotency,money}from'@/src/lib/format';
import{useAuth}from'@/src/state/Auth';
import{isAgent,isCreator,isMember,canOperate}from'@/src/state/roles';

type PaymentMode='CASH'|'UPI'|'SPLIT';

export default function Payment(){
 const{chitId,monthId}=useLocalSearchParams<{chitId:string;monthId:string}>();
 const{user}=useAuth();
 const[data,setData]=useState<any>();
 const[pays,setPays]=useState<any[]>([]);
 const[chit,setChit]=useState<any>();
 const[access,setAccess]=useState<any>();
 const[mode,setMode]=useState<PaymentMode>('UPI');
 const[amount,setAmount]=useState('');
 const[cashAmount,setCashAmount]=useState('');
 const[upiAmount,setUpiAmount]=useState('');
 const[cashReference,setCashReference]=useState('');
 const[upiReference,setUpiReference]=useState('');
 const[busy,setBusy]=useState(false);

 const load=useCallback(async()=>{
  try{
   const[o,p,c]=await Promise.all([
    paymentsApi.obligations(String(chitId),String(monthId)),
    paymentsApi.list(String(chitId),String(monthId)),
    chitsApi.get(String(chitId))
   ]);
   setData(o.data?.data??o.data);
   setPays(p.data?.data?.payments??p.data?.data??[]);
   const cd=c.data?.data??c.data;setChit(cd);
   if(isAgent(user)&&!isCreator(user,cd)){
    try{const a=await agentApi.chit(String(chitId));setAccess(a.data?.data??a.data)}catch{setAccess(undefined)}
   }
  }catch(e){Alert.alert('Unable to load',errMsg(e))}
 },[chitId,monthId,user?.id]);

 useEffect(()=>{if(chitId&&monthId)load()},[load]);

 const mine=useMemo(()=>Array.isArray(data?.obligations)&&data.obligations.length?data.obligations[0]:null,[data]);
 const outstanding=Number(mine?.outstandingAmount||0);
 const canVerify=canOperate(user,chit,'can_verify_payments',access);
 const agent=chit?.responsibleAgent;

 const submitPart=async(
  partAmount:number,
  method:'CASH'|'UPI',
  reference:string,
  key:string
 )=>{
  return paymentsApi.submit(String(chitId),String(mine.chitParticipantId),{
   amount:partAmount.toFixed(2),
   paymentMethod:method,
   transactionReference:reference.trim(),
   paymentDate:new Date().toISOString(),
   obligationId:mine.id,
   notes:method==='CASH'?'Cash paid to responsible agent':'UPI/bank transfer recorded from mobile',
   idempotencyKey:key
  });
 };

 const submit=async()=>{
  if(!mine)return Alert.alert('No obligation','Your contribution obligation is not available for this month.');
  if(outstanding<=0)return Alert.alert('Already paid','There is no outstanding contribution.');
  let parts:{amount:number;method:'CASH'|'UPI';reference:string}[]=[];
  if(mode==='CASH'){
   const n=Number(amount||outstanding);
   parts=[{amount:n,method:'CASH',reference:cashReference}];
  }else if(mode==='UPI'){
   const n=Number(amount||outstanding);
   parts=[{amount:n,method:'UPI',reference:upiReference}];
  }else{
   parts=[
    {amount:Number(cashAmount),method:'CASH',reference:cashReference},
    {amount:Number(upiAmount),method:'UPI',reference:upiReference}
   ].filter(x=>x.amount>0);
  }

  const total=parts.reduce((sum,p)=>sum+p.amount,0);
  if(!parts.length||!parts.every(p=>Number.isFinite(p.amount)&&p.amount>0)){
   return Alert.alert('Invalid amount','Enter a valid contribution amount.');
  }
  if(total>outstanding+0.005){
   return Alert.alert('Invalid amount',`Total payment cannot exceed ${money(outstanding)}.`);
  }
  for(const p of parts){
   if(!p.reference.trim()){
    return Alert.alert('Reference required',p.method==='CASH'
      ?'Enter the cash receipt/reference number.'
      :'Enter the UPI transaction reference.');
   }
  }

  setBusy(true);
  try{
   const key=idempotency();
   for(let i=0;i<parts.length;i++){
    await submitPart(parts[i].amount,parts[i].method,parts[i].reference,`${key}-${i+1}`);
   }
   Alert.alert(
    'Payment submitted',
    mode==='SPLIT'
      ?'Your cash and UPI payments are pending verification by the chit operator.'
      :'Your payment is pending verification by the chit operator.'
   );
   setAmount('');setCashAmount('');setUpiAmount('');setCashReference('');setUpiReference('');
   await load();
  }catch(e){Alert.alert('Payment failed',errMsg(e))}
  finally{setBusy(false)}
 };

 const verify=async(p:any)=>{
  setBusy(true);
  try{await paymentsApi.verify(p.id,{status:'VERIFIED'});await load()}
  catch(e){Alert.alert('Verification failed',errMsg(e))}
  finally{setBusy(false)}
 };

 if(!data)return <Screen title="Payments" back={()=>router.back()}><Loading/></Screen>;

 return <Screen title={`Month ${String(data.monthNumber)}`} subtitle={`${date(data.scheduledDate)} · ${money(data.scheduledAmount)} / member`} back={()=>router.back()}>
  <ScrollView>
   <Card>
    <Text style={s.section}>Where to pay</Text>
    <Text style={s.muted}>Cash: hand the contribution to the responsible agent and keep the receipt/reference. UPI: transfer to the responsible agent's UPI ID and enter the transaction reference.</Text>
    {agent?<><Text style={{fontWeight:'800',marginTop:10}}>Responsible agent: {String(agent.name||'Agent')}</Text><Text>{String(agent.mobile||'—')}</Text>{agent.upi_id?<Text style={s.success}>UPI ID: {String(agent.upi_id)}</Text>:<Text style={s.danger}>UPI ID is not configured. Ask the agent for the correct UPI ID before paying.</Text>}</>:<Text style={s.danger}>Responsible agent payment details are not configured yet. Contact the chit operator.</Text>}
   </Card>

   {mine&&<Card>
    <Text style={s.section}>My contribution</Text>
    <Text>Due {money(mine.dueAmount)} · Paid {money(mine.paidAmount)} · Outstanding {money(mine.outstandingAmount)}</Text>
    <Badge tone={mine.status==='PAID'?'green':mine.status==='PARTIAL'?'orange':'orange'}>{String(mine.status||'PENDING')}</Badge>

    {isMember(user)&&outstanding>0&&<>
     <Text style={[s.muted,{marginTop:12}]}>Payment method</Text>
     <View style={s.row}>
      {(['UPI','CASH','SPLIT'] as PaymentMode[]).map(x=><Button key={x} title={x} secondary={mode!==x} onPress={()=>setMode(x)}/>)}
     </View>

     {mode!=='SPLIT'&&<>
      <Input label="Amount" value={amount} onChangeText={setAmount} placeholder={String(outstanding)} keyboardType="decimal-pad"/>
      <Input
       label={mode==='CASH'?'Cash receipt / reference':'UPI transaction reference'}
       value={mode==='CASH'?cashReference:upiReference}
       onChangeText={mode==='CASH'?setCashReference:setUpiReference}
       placeholder={mode==='CASH'?'CASH-001':'UPI-12345'}
       autoCapitalize="characters"
      />
     </>}

     {mode==='SPLIT'&&<>
      <Input label="Cash amount" value={cashAmount} onChangeText={setCashAmount} placeholder="0.00" keyboardType="decimal-pad"/>
      <Input label="Cash receipt / reference" value={cashReference} onChangeText={setCashReference} placeholder="CASH-001" autoCapitalize="characters"/>
      <Input label="UPI amount" value={upiAmount} onChangeText={setUpiAmount} placeholder="0.00" keyboardType="decimal-pad"/>
      <Input label="UPI transaction reference" value={upiReference} onChangeText={setUpiReference} placeholder="UPI-12345" autoCapitalize="characters"/>
      <Text style={s.muted}>Split total: {money((Number(cashAmount)||0)+(Number(upiAmount)||0))} · Outstanding: {money(outstanding)}</Text>
     </>}

     <Button title={mode==='SPLIT'?'Submit Split Contribution':'Submit Contribution'} onPress={submit} disabled={busy}/>
    </>}
   </Card>}

   {canVerify&&<Card>
    <Text style={s.section}>Verify member payments</Text>
    {pays.length===0&&<Text style={s.muted}>No submitted payments yet.</Text>}
    {pays.map(p=><Card key={String(p.id)}>
     <Text style={{fontWeight:'800'}}>Member {String(p.participantSequence||p.participant_sequence||'')}</Text>
     <Text>{money(p.amount)} · {String(p.paymentMethod||p.payment_method||'')} · {String(p.transactionReference||p.transaction_reference||'—')}</Text>
     <Badge tone={p.status==='VERIFIED'?'green':'orange'}>{String(p.status||'UNKNOWN')}</Badge>
     {p.status!=='VERIFIED'&&<Button title="Verify" onPress={()=>verify(p)} disabled={busy}/>}
    </Card>)}
   </Card>}

   <Button title="Refresh" secondary onPress={load}/>
  </ScrollView>
 </Screen>
}
