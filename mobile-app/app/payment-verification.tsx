import {View,Text,FlatList,Pressable,StyleSheet,Alert} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useEffect,useState} from 'react';
import {paymentAdminApi} from '@/src/api/payment-admin';

export default function PaymentVerification(){
 const {chitId}=useLocalSearchParams<{chitId:string}>();const [rows,setRows]=useState<any[]>([]);
 async function load(){if(chitId){const r=await paymentAdminApi.pending(String(chitId));setRows(r.data?.data??r.data??[])}}
 useEffect(()=>{load()},[chitId]);
 async function action(id:string,status:string){
  try{if(status==='VERIFY')await paymentAdminApi.verify(id,{status:'VERIFIED'});else await paymentAdminApi.reject(id,{reason:'Rejected by creator'});await load()}
  catch(e:any){Alert.alert('Action failed',e?.response?.data?.message??'Unable to update payment')}
 }
 return <View style={styles.container}><Text style={styles.title}>Payment Verification</Text>
 <FlatList data={rows} keyExtractor={x=>String(x.id)} renderItem={({item})=><View style={styles.card}>
  <Text style={styles.amount}>₹{item.amount}</Text><Text>{item.member_name??item.user_name}</Text><Text>{item.payment_method}</Text>
  <View style={styles.actions}><Pressable style={styles.verify} onPress={()=>action(item.id,'VERIFY')}><Text>Verify</Text></Pressable>
  <Pressable style={styles.reject} onPress={()=>action(item.id,'REJECT')}><Text>Reject</Text></Pressable></View>
 </View>}/>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700'},card:{padding:16,borderWidth:1,borderColor:'#ddd',borderRadius:12,marginTop:12},amount:{fontSize:20,fontWeight:'700'},actions:{flexDirection:'row',gap:10,marginTop:12},verify:{padding:12,borderRadius:8,backgroundColor:'#dcfce7'},reject:{padding:12,borderRadius:8,backgroundColor:'#fee2e2'}});
