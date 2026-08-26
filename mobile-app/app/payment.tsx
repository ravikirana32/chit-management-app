import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { paymentsApi } from '@/src/api/payments';
import { requireOnline } from '@/src/financial/mutation-guard';
import { validatePaymentAmount } from '@/src/validation/financial';

export default function Payment(){
 const {chitId,participantId,obligationId,monthId}=useLocalSearchParams<any>();
 const [amount,setAmount]=useState(''); const [method,setMethod]=useState('UPI'); const [loading,setLoading]=useState(false);
 async function submit(){
  if(!amount) return Alert.alert('Amount required');
  const check=validatePaymentAmount(Number(amount),Number.MAX_SAFE_INTEGER);
  if(!check.valid)return Alert.alert('Invalid payment',check.message);
  setLoading(true);
  try{await requireOnline();}catch(e:any){setLoading(false);return Alert.alert('Offline',e.message);}
  try{
   await paymentsApi.create({chitId,participantId,obligationId,chitMonthId:monthId,amount:Number(amount),paymentMethod:method});
   Alert.alert('Payment submitted','The payment is now pending verification.');
  }catch(e:any){Alert.alert('Payment failed',e?.response?.data?.message??'Unable to submit payment');}
  finally{setLoading(false);}
 }
 return <View style={styles.container}>
  <Text style={styles.title}>Monthly Payment</Text>
  <Text style={styles.note}>UPI and cash payments can be submitted. Verification is handled by the backend.</Text>
  <TextInput style={styles.input} accessibilityLabel="Payment amount" testID="payment-amount" placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount}/>
  <View style={styles.methods}>{['UPI','CASH','BANK_TRANSFER'].map(m=>
    <Pressable key={m} style={[styles.method,method===m&&styles.selected]} onPress={()=>setMethod(m)}><Text>{m}</Text></Pressable>)}</View>
  <Pressable accessibilityRole="button" testID="payment-submit" style={styles.button} disabled={loading} onPress={submit}><Text style={styles.buttonText}>{loading?'Submitting…':'Submit Payment'}</Text></Pressable>
 </View>
}
const styles=StyleSheet.create({
 container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700'},note:{marginVertical:16},
 input:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:14},methods:{flexDirection:'row',gap:8,marginVertical:16},
 method:{padding:12,borderWidth:1,borderColor:'#ccc',borderRadius:9},selected:{backgroundColor:'#e5e7eb'},
 button:{padding:15,borderRadius:10,alignItems:'center',backgroundColor:'#111827'},buttonText:{color:'white',fontWeight:'700'}
});
