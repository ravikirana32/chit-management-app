import {View,Text,TextInput,Pressable,StyleSheet,Alert} from 'react-native';
import {useLocalSearchParams,router} from 'expo-router';
import {api} from '@/src/api/client';
export default function RecordCash(){
 const {obligationId}=useLocalSearchParams<{obligationId:string}>();const [amount,setAmount]=useState('');
 const submit=async()=>{try{await api.post(`/v1/payment-collection/obligations/${obligationId}/record-cash`,{method:'CASH',amount,cashReceiptNote:'Cash received'});Alert.alert('Recorded','Cash payment marked as paid');router.back()}catch{Alert.alert('Error','Unable to record cash payment')}};
 return <View style={styles.c}><Text style={styles.t}>Record Cash Payment</Text><Text>Amount received</Text><TextInput style={styles.i} keyboardType="decimal-pad" value={amount} onChangeText={setAmount}/><Pressable style={styles.b} onPress={submit}><Text>Mark as Paid — Cash</Text></Pressable></View>
}
const styles=StyleSheet.create({c:{padding:22,paddingTop:60},t:{fontSize:26,fontWeight:'800',marginBottom:20},i:{borderWidth:1,padding:14,borderRadius:10,marginVertical:15},b:{padding:16,borderWidth:1,borderRadius:10,alignItems:'center'}});
