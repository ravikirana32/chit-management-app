import React,{useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router}from'expo-router';
import{chitImportApi}from'@/src/api/all';
import{Button,Card,Input,Screen,s}from'@/src/components/UI';
import{errMsg,money}from'@/src/lib/format';
import{useAuth}from'@/src/state/Auth';

export default function ExistingChit(){
 const{user}=useAuth();
 const[chitId,setChitId]=useState('');
 const[currentMonth,setCurrentMonth]=useState('');
 const[chitName,setChitName]=useState('');
 const[chitType,setChitType]=useState<'FIXED_DRAW'|'AUCTION'|'AGENT_CHIT'>('FIXED_DRAW');
 const[json,setJson]=useState('');
 const[busy,setBusy]=useState(false);
 const[review,setReview]=useState<any>();

 const example=useMemo(()=>JSON.stringify({
   chitId:'EXISTING_CHIT_UUID',
   currentMonthNumber:4,
   members:[
     {memberId:'USER_UUID_1',name:'Member 1',sequence:1},
     {memberId:'USER_UUID_2',name:'Member 2',sequence:2}
   ],
   months:[
     {
       monthNumber:1,amount:'10000',collectedAmount:'20000',
       winnerMemberId:'USER_UUID_1',winnerName:'Member 1',
       payoutAmount:'15000',openingSavings:'0',closingSavings:'5000',
       completedAt:'2026-06-05T00:00:00.000Z'
     },
     {
       monthNumber:2,amount:'10000',collectedAmount:'20000',
       winnerMemberId:'USER_UUID_2',winnerName:'Member 2',
       payoutAmount:'14000',openingSavings:'5000',closingSavings:'11000',
       completedAt:'2026-07-05T00:00:00.000Z'
     },
     {
       monthNumber:3,amount:'10000',collectedAmount:'20000',
       payoutAmount:'13000',openingSavings:'11000',closingSavings:'18000',
       completedAt:'2026-08-05T00:00:00.000Z'
     }
   ],
   payments:[
     {monthNumber:1,memberId:'USER_UUID_1',amount:'10000',method:'CASH',reference:'CASH-M1-1'},
     {monthNumber:1,memberId:'USER_UUID_2',amount:'10000',method:'UPI',reference:'UPI-M1-2'},
     {monthNumber:2,memberId:'USER_UUID_1',amount:'6000',method:'CASH',reference:'CASH-M2-1'},
     {monthNumber:2,memberId:'USER_UUID_1',amount:'4000',method:'UPI',reference:'UPI-M2-1'},
     {monthNumber:2,memberId:'USER_UUID_2',amount:'10000',method:'UPI',reference:'UPI-M2-2'}
   ]
 },null,2),[]);

 const parse=()=>{
   try{
     const p=JSON.parse(json);
     if(!p.chitId)p.chitId=chitId;
     if(!p.currentMonthNumber)p.currentMonthNumber=Number(currentMonth);
     return p;
   }catch{throw new Error('Enter valid JSON data.')}
 };

 const validate=async()=>{
   setBusy(true);
   try{
     const p=parse();
     const r=await chitImportApi.validate(p);
     setReview(r.data?.data??r.data);
     if(!(r.data?.data?.valid??r.data?.valid))Alert.alert('Validation failed',(r.data?.data?.errors??[]).join('\n'));
     else Alert.alert('Validated','Historical data is valid. You can create the review batch.');
   }catch(e){Alert.alert('Validation failed',errMsg(e))}
   finally{setBusy(false)}
 };

 const create=async()=>{
   setBusy(true);
   try{
     const p=parse();
     const r=await chitImportApi.createBatch(p);
     const d=r.data?.data??r.data;
     if(!r.data?.success&&!d)throw new Error(r.data?.message||'Unable to create batch');
     const id=d.id;
     await chitImportApi.review(id);
     setReview(await chitImportApi.getBatch(id).then(x=>x.data?.data??x.data));
     Alert.alert('Ready to apply',`Import batch ${id} was created and reviewed. Verify the data before applying.`);
   }catch(e){Alert.alert('Create batch failed',errMsg(e))}
   finally{setBusy(false)}
 };

 const apply=async()=>{
   if(!review?.id)return;
   Alert.alert(
     'Apply running chit history?',
     'This will lock the historical months and activate the selected next month. This action should only be used after checking the historical records.',
     [
       {text:'Cancel',style:'cancel'},
       {text:'Apply',onPress:async()=>{
         setBusy(true);
         try{
           const r=await chitImportApi.apply(review.id);
           const d=r.data?.data??r.data;
           if(!r.data?.success)throw new Error(r.data?.message||'Apply failed');
           Alert.alert('Running chit activated',d.message||`Month ${d.currentMonthNumber} is active.`);
           router.replace({pathname:'/chit-detail',params:{chitId:String(d.chitId)}});
         }catch(e){Alert.alert('Import failed',errMsg(e))}
         finally{setBusy(false)}
       }}
     ]
   );
 };

 return <Screen title="Existing / Running Chit" subtitle="Bring an already-running chit into the app" back={()=>router.back()}>
   <ScrollView>
     <Card>
       <Text style={s.section}>How this works</Text>
       <Text>Enter the existing chit ID and the next active month. Supply monthwise historical collections, winners, payouts and savings. Historical months are locked; the selected next month becomes ACTIVE.</Text>
       <Text style={s.muted}>Do not invent missing figures. Leave unknown historical fields empty and add a note explaining what is unavailable.</Text>
     </Card>
     <Card>
       <Input label="Existing chit ID" value={chitId} onChangeText={setChitId} placeholder="Chit UUID"/>
       <Input label="Next active month number" value={currentMonth} onChangeText={setCurrentMonth} placeholder="4" keyboardType="number-pad"/>
       <Input label="Optional label" value={chitName} onChangeText={setChitName} placeholder="Existing Chit"/>
       <Text style={s.muted}>Chit type: {chitType}</Text>
       <View style={s.row}>
         {(['FIXED_DRAW','AUCTION','AGENT_CHIT'] as const).map(x=>
           <Button key={x} title={x} secondary={chitType!==x} onPress={()=>setChitType(x)}/>
         )}
       </View>
     </Card>
     <Card>
       <Text style={s.section}>Historical data JSON</Text>
       <Text style={s.muted}>The API validates member IDs, month sequence, payments and payout component totals before any financial data is materialized.</Text>
       <Input label="JSON" value={json} onChangeText={setJson} placeholder={example} multiline/>
       <Button title="Validate history" onPress={validate} disabled={busy}/>
       <Button title="Create & Review Import Batch" secondary onPress={create} disabled={busy}/>
       <Button title="Load example structure" secondary onPress={()=>setJson(example)}/>
     </Card>
     {review&&<Card>
       <Text style={s.section}>Import review</Text>
       <Text>Status: {String(review.status||review.valid||'READY')}</Text>
       {review.counts&&<Text>Members {review.counts.members} · Historical months {review.counts.historicalMonths} · Payments {review.counts.payments}</Text>}
       <Text style={s.muted}>After apply, historical months are LOCKED and the next active month is opened for normal Fixed Draw / Auction / Agent Chit operations.</Text>
       {review.id&&<Button title="Apply & Activate Running Chit" onPress={apply} disabled={busy}/>}
     </Card>}
     <Card>
       <Text style={s.section}>Example financial chain</Text>
       <Text>Month 1 closing savings → Month 2 opening savings → Month 2 closing savings → Month 3 opening savings.</Text>
       <Text style={s.muted}>Existing contribution payments may be split into multiple CASH/UPI rows just like live payments.</Text>
     </Card>
   </ScrollView>
 </Screen>
}
