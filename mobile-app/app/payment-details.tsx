import {View,Text,TextInput,Switch,Pressable,StyleSheet,Alert} from 'react-native';
import {useEffect,useState} from 'react';
import {api} from '@/src/api/client';
export default function PaymentDetails(){
 const [v,setV]=useState<any>({cashEnabled:true,preferredMethod:'UPI'});
 useEffect(()=>{api.get('/v1/profile/payment-details').then(r=>setV(r.data?.data??{})).catch(()=>{})},[]);
 const save=async()=>{try{await api.put('/v1/profile/payment-details',v);Alert.alert('Saved')}catch{Alert.alert('Error','Could not save payment details')}};
 return <View style={styles.c}><Text style={styles.t}>Payment Details</Text><Text>UPI ID</Text><TextInput style={styles.i} value={v.upiId||''} onChangeText={x=>setV({...v,upiId:x})} placeholder="name@upi" autoCapitalize="none"/><Text>UPI name</Text><TextInput style={styles.i} value={v.upiName||''} onChangeText={x=>setV({...v,upiName:x})}/><View style={styles.row}><Text>Cash accepted</Text><Switch value={!!v.cashEnabled} onValueChange={x=>setV({...v,cashEnabled:x})}/></View><Pressable style={styles.b} onPress={save}><Text>Save</Text></Pressable></View>
}
const styles=StyleSheet.create({c:{padding:22,paddingTop:55},t:{fontSize:28,fontWeight:'800',marginBottom:20},i:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:12,marginVertical:8},row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:18},b:{padding:15,borderWidth:1,borderRadius:10,alignItems:'center'}});
