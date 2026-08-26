import { useLocalSearchParams,router } from 'expo-router';
import { View,Text,TextInput,Pressable,StyleSheet,Alert } from 'react-native';
import { useState } from 'react';
import { chitsApi } from '@/src/api/chits';

export default function ChitSetup(){
 const {type}=useLocalSearchParams<{type:string}>();
 const [name,setName]=useState(''); const [members,setMembers]=useState(''); const [amount,setAmount]=useState(''); const [grace,setGrace]=useState('7'); const [loading,setLoading]=useState(false);
 const title=type==='FIXED'?'Fixed Draw Setup':type==='AUCTION'?'Auction Chit Setup':'Agent Chit Setup';
 async function create(){
  if(!name||!members||!amount)return Alert.alert('Required','Enter chit name, members and amount');
  setLoading(true);
  try{
   const r=await chitsApi.create({name,chitType:type==='AUCTION'?'AUCTION':'FIXED',totalMembers:Number(members),firstMonthlyAmount:Number(amount)});
   const chit=r.data?.data??r.data;
   if(chit?.id){
    await chitsApi.updateRules(chit.id,{graceDays:Number(grace),commissionMode:type==='AGENT'?'PER_AGENT_MONTH':'NONE'});
    router.replace({pathname:'/members',params:{chitId:chit.id}});
   }
  }catch(e:any){Alert.alert('Create failed',e?.response?.data?.message??'Unable to create chit')}
  finally{setLoading(false)}
 }
 return <View style={styles.container}><Text style={styles.title}>{title}</Text>
  <TextInput style={styles.input} placeholder="Chit name" value={name} onChangeText={setName}/>
  <TextInput style={styles.input} placeholder="Number of members" keyboardType="number-pad" value={members} onChangeText={setMembers}/>
  <TextInput style={styles.input} placeholder="First monthly amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount}/>
  <TextInput style={styles.input} placeholder="Payment grace days" keyboardType="number-pad" value={grace} onChangeText={setGrace}/>
  {type==='AGENT'&&<Text style={styles.note}>Agent months are configured before publish. No draw or bidding occurs in an Agent Chit month.</Text>}
  <Pressable style={styles.button} disabled={loading} onPress={create}><Text style={styles.buttonText}>{loading?'Creating…':'Create & Continue'}</Text></Pressable>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700',marginBottom:22},
input:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:14,marginBottom:12},note:{padding:14,borderRadius:10,backgroundColor:'#f3f4f6',marginBottom:16},
button:{padding:15,borderRadius:10,alignItems:'center',backgroundColor:'#111827'},buttonText:{color:'white',fontWeight:'700'}});
