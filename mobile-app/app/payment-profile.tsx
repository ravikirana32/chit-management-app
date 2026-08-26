import {View,Text,TextInput,Pressable,StyleSheet,Alert} from 'react-native';
import {useAppSelector} from '@/src/store';
import {useState} from 'react';
import {profileApi} from '@/src/api/profile';

export default function PaymentProfile(){
 const user=useAppSelector(s=>s.auth.user);
 const [upi,setUpi]=useState(''); const [bank,setBank]=useState(''); const [account,setAccount]=useState('');
 const [ifsc,setIfsc]=useState(''); const [cash,setCash]=useState(false); const [loading,setLoading]=useState(false);
 async function save(){
  setLoading(true);
  try{await profileApi.updatePaymentProfile({upiId:upi,bankName:bank,accountNumber:account,ifsc,cashAccepted:cash});
    Alert.alert('Saved','Payment profile updated');
  }catch(e:any){Alert.alert('Failed',e?.response?.data?.message??'Unable to update payment profile')}
  finally{setLoading(false)}
 }
 return <View style={styles.container}><Text style={styles.title}>Payment Profile</Text>
  <Text style={styles.note}>These details can be used when you receive a chit payout. Keep them accurate.</Text>
  <TextInput style={styles.input} placeholder="UPI ID" value={upi} onChangeText={setUpi}/>
  <TextInput style={styles.input} placeholder="Bank name" value={bank} onChangeText={setBank}/>
  <TextInput style={styles.input} placeholder="Account number" value={account} onChangeText={setAccount} keyboardType="number-pad"/>
  <TextInput style={styles.input} placeholder="IFSC" value={ifsc} onChangeText={setIfsc} autoCapitalize="characters"/>
  <Pressable style={[styles.toggle,cash&&styles.selected]} onPress={()=>setCash(!cash)}><Text>Cash payout accepted: {cash?'Yes':'No'}</Text></Pressable>
  <Pressable style={styles.button} disabled={loading} onPress={save}><Text style={styles.buttonText}>{loading?'Saving…':'Save Payment Profile'}</Text></Pressable>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700'},note:{marginVertical:16},input:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:14,marginBottom:12},toggle:{padding:14,borderWidth:1,borderRadius:10},selected:{backgroundColor:'#e5e7eb'},button:{marginTop:18,padding:15,borderRadius:10,backgroundColor:'#111827',alignItems:'center'},buttonText:{color:'white',fontWeight:'700'}});
