import {View,Text,Pressable,StyleSheet} from 'react-native';
import {useLocalSearchParams,router} from 'expo-router';

export default function WinnerDetails(){
 const p=useLocalSearchParams<any>();
 return <View style={styles.container}><Text style={styles.title}>Winner</Text>
  <Text style={styles.item}>Member: {p.memberName??'Winner'}</Text>
  <Text style={styles.item}>Month: {p.monthNumber??'—'}</Text>
  <Text style={styles.item}>Gross Chit: ₹{p.grossAmount??'—'}</Text>
  <Text style={styles.item}>Discount: ₹{p.discount??0}</Text>
  <Text style={styles.item}>Payout: ₹{p.payoutAmount??'—'}</Text>
  <Text style={styles.item}>Payout status: {p.payoutStatus??'PENDING'}</Text>
  <Pressable style={styles.button} onPress={()=>router.push('/payment-profile')}><Text style={styles.buttonText}>View Payment Profile</Text></Pressable>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700',marginBottom:18},item:{padding:14,borderBottomWidth:1,borderBottomColor:'#eee'},button:{marginTop:24,padding:15,borderRadius:10,backgroundColor:'#111827',alignItems:'center'},buttonText:{color:'white',fontWeight:'700'}});
