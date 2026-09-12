import React,{useEffect,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{payoutsApi,chitsApi,agentApi}from'@/src/api/all';
import{Badge,Button,Card,Input,Loading,Screen,s}from'@/src/components/UI';
import{errMsg,money}from'@/src/lib/format';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isCreator,isAgent}from'@/src/state/roles';

export default function Payouts(){
 const{chitId}=useLocalSearchParams<{chitId:string}>();
 const{user}=useAuth();
 const[data,setData]=useState<any[]>([]);
 const[chit,setChit]=useState<any>();
 const[access,setAccess]=useState<any>();
 const[editing,setEditing]=useState<string|null>(null);
 const[mode,setMode]=useState<'FULL_CASH'|'FULL_UPI'|'SPLIT'>('FULL_CASH');
 const[cashAmount,setCashAmount]=useState('');
 const[upiAmount,setUpiAmount]=useState('');
 const[cashRef,setCashRef]=useState('');
 const[upiRef,setUpiRef]=useState('');
 const[fullRef,setFullRef]=useState('');
 const[busy,setBusy]=useState(false);

 const resetForm=()=>{
   setMode('FULL_CASH');
   setCashAmount('');
   setUpiAmount('');
   setCashRef('');
   setUpiRef('');
   setFullRef('');
 };

 const load=async()=>{
   try{
     const[c,p]=await Promise.all([
       chitsApi.get(String(chitId)),
       payoutsApi.list(String(chitId))
     ]);
     const d=c.data?.data??c.data;
     setChit(d);
     setData(Array.isArray(p.data?.data)?p.data.data:[]);
     if(isAgent(user)&&!isCreator(user,d)){
       try{
         const a=await agentApi.chit(String(chitId));
         setAccess(a.data?.data??a.data);
       }catch{setAccess(undefined)}
     }
   }catch(e){
     Alert.alert('Unable to load',errMsg(e));
   }
 };

 useEffect(()=>{load()},[chitId,user?.id]);

 if(!chit)return <Screen title="Payouts" back={()=>router.back()}><Loading/></Screen>;

 const allowed=
   isAdmin(user)||
   isCreator(user,chit)||
   (isAgent(user)&&(access?.can_collect_cash===true||access?.can_manage_chit===true));

 const settleAllowed=allowed;

 if(!allowed)return <Screen title="Payouts" back={()=>router.back()}>
   <Card><Text style={s.danger}>You do not have payout-register access for this chit.</Text></Card>
 </Screen>;

 const begin=(p:any)=>{
   setEditing(String(p.id));
   resetForm();
   const amount=Number(p.amount||0);
   setCashAmount(amount.toFixed(2));
 };

 const settle=async(p:any)=>{
   const total=Number(p.amount||0);
   let payload:any={
     status:'SETTLED',
     notes:'Settled from mobile'
   };

   if(mode==='SPLIT'){
     const cash=Number(cashAmount||0);
     const upi=Number(upiAmount||0);
     if(!Number.isFinite(cash)||cash<0||!Number.isFinite(upi)||upi<0||cash+upi<=0)
       return Alert.alert('Invalid split','Enter valid cash and UPI amounts.');
     if(Math.abs((cash+upi)-total)>0.001)
       return Alert.alert('Amount mismatch',`Cash + UPI must equal ${money(total)}.`);
     if(cash>0&&!cashRef.trim())
       return Alert.alert('Cash reference required','Enter the cash receipt/reference.');
     if(upi>0&&!upiRef.trim())
       return Alert.alert('UPI reference required','Enter the UPI transaction reference.');

     payload.components=[];
     if(cash>0)payload.components.push({
       amount:cash.toFixed(2),
       paymentMethod:'CASH',
       transactionReference:cashRef.trim(),
       notes:'Cash payout component'
     });
     if(upi>0)payload.components.push({
       amount:upi.toFixed(2),
       paymentMethod:'UPI',
       transactionReference:upiRef.trim(),
       notes:'UPI payout component'
     });
   }else{
     const method=mode==='FULL_UPI'?'UPI':'CASH';
     if(!fullRef.trim())
       return Alert.alert(
         'Reference required',
         method==='CASH'
           ?'Enter a cash receipt/reference.'
           :'Enter the UPI transaction reference.'
       );
     payload.paymentMethod=method;
     payload.transactionReference=fullRef.trim();
   }

   setBusy(true);
   try{
     await payoutsApi.settle(String(p.id),payload);
     setEditing(null);
     resetForm();
     await load();
     Alert.alert(
       'Payout settled',
       mode==='SPLIT'
         ?'Cash + UPI payout components were recorded and the chit savings balance was updated atomically.'
         :'The payout and chit savings balance were updated atomically.'
     );
   }catch(e){
     Alert.alert('Settlement failed',errMsg(e));
   }finally{
     setBusy(false);
   }
 };

 const agentUserByMonth=new Map(
   (Array.isArray(chit.months)?chit.months:[])
     .filter((m:any)=>String(m.month_type||'').toUpperCase()==='AGENT_CHIT')
     .map((m:any)=>[String(m.id),String(m.agent_user_id||'')])
 );

 const settledAgentMonths=new Set(
   data
     .filter((x:any)=>{
       if(String(x.status||'').toUpperCase()!=='SETTLED')return false;
       const monthKey=String(x.chit_month_id??x.chitMonthId);
       const notes=String(x.notes||'');
       return notes.startsWith('AGENT_CHIT:')||
         Boolean(x.recipient_agent_id)||
         (agentUserByMonth.get(monthKey)&&
          String(x.recipient_user_id??x.recipientUserId??'')===agentUserByMonth.get(monthKey));
     })
     .map((x:any)=>String(x.chit_month_id??x.chitMonthId))
 );

 return <Screen title="Payouts" subtitle="Winner / agent settlement" back={()=>router.back()}>
   <ScrollView>
     <Card>
       <Text style={s.section}>Settlement authorization</Text>
       <Text>{`View payout register: ${allowed?'Allowed':'No'}`}</Text>
       <Text>{`Settle payout: ${settleAllowed?'Allowed':'No'}`}</Text>
       <Text style={s.muted}>
         Full Cash, full UPI, or a Cash + UPI split can be recorded.
         The settlement is accepted only when the components equal the payout amount.
       </Text>
     </Card>

     {data.length===0&&
       <Card><Text style={s.muted}>No pending or settled payouts for this chit.</Text></Card>
     }

     {data.map(p=>{
       const isAgentPayout=
         String(p.notes||'').startsWith('AGENT_CHIT:')||
         Boolean(p.recipient_agent_id)||
         (agentUserByMonth.get(String(p.chit_month_id??p.chitMonthId))&&
          String(p.recipient_user_id??p.recipientUserId??'')===agentUserByMonth.get(String(p.chit_month_id??p.chitMonthId)));

       const monthKey=String(p.chit_month_id??p.chitMonthId);
       const pending=
         String(p.status||'').toUpperCase()!=='SETTLED'&&
         !String(p.status||'').toUpperCase().includes('FAILED');

       const supersededAgentPending=
         isAgentPayout&&pending&&settledAgentMonths.has(monthKey);

       const components=Array.isArray(p.components)?p.components:[];

       return <Card key={String(p.id)}>
         {supersededAgentPending&&
           <Text style={s.muted}>Superseded by the settled Agent Chit payout for this month.</Text>
         }

         <View style={s.row}>
           <Text style={{fontWeight:'800',flex:1}}>
             {String(p.recipient_name||p.recipientName||p.recipient_user_id||'Recipient')}
           </Text>
           <Badge tone={pending?'orange':'green'}>{String(p.status||'UNKNOWN')}</Badge>
         </View>

         <Text style={{fontSize:21,fontWeight:'800'}}>{money(p.amount)}</Text>

         {components.length>0
           ? <View>
               <Text style={s.muted}>Settlement components:</Text>
               {components.map((c:any,i:number)=>
                 <Text key={String(c.id||i)}>
                   {String(c.paymentMethod||c.payment_method)} · {money(c.amount)} · {String(c.transactionReference||c.transaction_reference||'—')}
                 </Text>
               )}
             </View>
           : <Text style={s.muted}>
               {String(p.payment_method||'—')} · {String(p.transaction_reference||'No reference')}
             </Text>
         }

         {pending&&!supersededAgentPending&&settleAllowed&&
           <>
             {editing===String(p.id)
               ? <>
                   <Text style={s.section}>Settlement method</Text>
                   <View style={s.row}>
                     {[
                       ['FULL_CASH','Full Cash'],
                       ['FULL_UPI','Full UPI'],
                       ['SPLIT','Cash + UPI']
                     ].map(([value,label])=>
                       <Button
                         key={value}
                         title={label}
                         secondary={mode!==value}
                         onPress={()=>{
                           const next=value as any;
                           setMode(next);
                           if(next==='FULL_CASH')setCashAmount(Number(p.amount||0).toFixed(2));
                         }}
                       />
                     )}
                   </View>

                   {mode==='SPLIT'
                     ? <>
                         <Input
                           label="Cash amount"
                           value={cashAmount}
                           onChangeText={setCashAmount}
                           placeholder="8000.00"
                           keyboardType="decimal-pad"
                         />
                         <Input
                           label="Cash receipt / reference"
                           value={cashRef}
                           onChangeText={setCashRef}
                           placeholder="CASH-001"
                           autoCapitalize="characters"
                         />
                         <Input
                           label="UPI amount"
                           value={upiAmount}
                           onChangeText={setUpiAmount}
                           placeholder="12000.00"
                           keyboardType="decimal-pad"
                         />
                         <Input
                           label="UPI transaction reference"
                           value={upiRef}
                           onChangeText={setUpiRef}
                           placeholder="UPI-12345"
                           autoCapitalize="characters"
                         />
                         <Text style={s.muted}>
                           Total: {money(Number(cashAmount||0)+Number(upiAmount||0))} / {money(Number(p.amount||0))}
                         </Text>
                       </>
                     : <Input
                         label={mode==='FULL_CASH'?'Cash receipt / reference':'UPI transaction reference'}
                         value={fullRef}
                         onChangeText={setFullRef}
                         placeholder={mode==='FULL_CASH'?'CASH-001':'UPI-12345'}
                         autoCapitalize="characters"
                       />
                   }

                   <Button title="Settle payout" onPress={()=>settle(p)} disabled={busy}/>
                   <Button title="Cancel" secondary onPress={()=>{setEditing(null);resetForm()}}/>
                 </>
               : <>
                   <Text style={s.muted}>
                     Verified member funds must cover this payout before settlement.
                   </Text>
                   <Button title="Settle payout" onPress={()=>begin(p)}/>
                 </>
             }
           </>
         }
       </Card>
     })}
   </ScrollView>
 </Screen>
}
