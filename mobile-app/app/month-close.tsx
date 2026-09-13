import React,{useState}from'react';
import{Alert,ScrollView,Text}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{closeApi}from'@/src/api/all';
import{Button,Card,Screen,s}from'@/src/components/UI';
import{errMsg}from'@/src/lib/format';

export default function MonthClose(){
 const{monthId}=useLocalSearchParams<{monthId:string}>();
 const[busy,setBusy]=useState(false);

 const close=async()=>{
   if(!monthId)return Alert.alert('Month ID required');
   setBusy(true);
   try{
     const r=await closeApi.month(String(monthId));
     const d=r.data?.data??r.data;
     if(r.data?.success===false||d?.success===false)
       throw new Error(r.data?.message||d?.message||'Month could not be locked');
     Alert.alert(
       'Month locked',
       'The month has been financially closed and locked.',
       [{text:'OK',onPress:()=>router.back()}]
     );
   }catch(e){
     Alert.alert('Cannot close month',errMsg(e));
   }finally{setBusy(false)}
 };

 if(!monthId)
   return <Screen title="Month Close" back={()=>router.back()}>
     <Card><Text style={s.danger}>Month ID is required.</Text></Card>
   </Screen>;

 return <Screen title="Month Close" subtitle="Final reconciliation → LOCKED" back={()=>router.back()}>
   <ScrollView>
     <Card>
       <Text style={s.section}>Finalize & Lock Month</Text>
       <Text style={s.muted}>
         Use this only after draw/auction/agent payout completion, all contribution
         obligations are resolved, and pending payouts are settled. The backend
         performs the final validation atomically before changing the month to LOCKED.
       </Text>
       <Button title="Finalize & Lock Month" onPress={close} disabled={busy}/>
     </Card>
   </ScrollView>
 </Screen>;
}
