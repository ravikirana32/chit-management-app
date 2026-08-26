import {View,Text,TextInput,Pressable,StyleSheet,Alert} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useState} from 'react';
import {agentApi} from '@/src/api/agent';

export default function AgentMonth(){
 const {chitId,monthId,agentId}=useLocalSearchParams<{chitId:string,monthId:string,agentId:string}>();
 const [amount,setAmount]=useState('');
 const [loading,setLoading]=useState(false);
 async function save(){
  if(!chitId||!monthId||!agentId||!amount)return Alert.alert('Required','Provide agent and commission amount');
  setLoading(true);
  try{await agentApi.recordCommission(String(chitId),String(monthId),{agentId:String(agentId),amount});Alert.alert('Saved','Agent commission recorded')}
  catch(e:any){Alert.alert('Failed',e?.response?.data?.message??'Unable to record commission')}
  finally{setLoading(false)}
 }
 return <View style={styles.container}><Text style={styles.title}>Agent Chit Month</Text>
  <Text style={styles.note}>No draw and no bidding. All members continue their normal contribution obligations. The configured agent receives the agent amount.</Text>
  <TextInput style={styles.input} placeholder="Agent commission" keyboardType="decimal-pad" value={amount} onChangeText={setAmount}/>
  <Pressable style={styles.button} disabled={loading} onPress={save}><Text style={styles.buttonText}>{loading?'Saving…':'Record Agent Commission'}</Text></Pressable>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700'},note:{marginVertical:18,padding:14,backgroundColor:'#f3f4f6',borderRadius:10},input:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:14},button:{marginTop:18,padding:15,borderRadius:10,backgroundColor:'#111827',alignItems:'center'},buttonText:{color:'white',fontWeight:'700'}});
