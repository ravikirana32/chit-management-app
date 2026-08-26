import {View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import {useLocalSearchParams,router} from 'expo-router';
import {useEffect,useState} from 'react';
import {chitsApi} from '@/src/api/chits';

export default function ChitDetail(){
 const {chitId}=useLocalSearchParams<{chitId:string}>();const [chit,setChit]=useState<any>();
 useEffect(()=>{if(chitId)chitsApi.get(chitId).then(r=>setChit(r.data?.data??r.data))},[chitId]);
 if(!chit)return <View style={styles.center}><Text>Loading chit…</Text></View>;
 return <ScrollView contentContainerStyle={styles.container}><Text style={styles.title}>{chit.name}</Text>
  <Text>{chit.chit_type} • {chit.status}</Text>
  <Text style={styles.section}>Monthly schedule</Text>
  {(chit.months??[]).map((m:any)=><View key={m.id} style={styles.month}>
   <Text style={styles.monthTitle}>Month {m.month_number}</Text><Text>₹{m.scheduled_amount}</Text><Text>{m.month_type} • {m.status}</Text>
   {m.month_type==='AGENT_CHIT'&&<Text>Agent month — no draw/bid</Text>}
   {m.month_type!=='AGENT_CHIT'&&chit.chit_type==='FIXED_DRAW'&&<Pressable style={styles.action} onPress={()=>router.push({pathname:'/fixed-draw',params:{chitId,chitMonthId:m.id}})}><Text>Draw</Text></Pressable>}
   {m.month_type!=='AGENT_CHIT'&&chit.chit_type==='AUCTION'&&<Pressable style={styles.action} onPress={()=>router.push({pathname:'/auction',params:{chitId,chitMonthId:m.id}})}><Text>Auction</Text></Pressable>}
  </View>)}
  <Pressable style={styles.action} onPress={()=>router.push({pathname:'/members',params:{chitId}})}><Text>Members</Text></Pressable>
 </ScrollView>
}
const styles=StyleSheet.create({container:{padding:20,paddingTop:55},center:{flex:1,alignItems:'center',justifyContent:'center'},title:{fontSize:28,fontWeight:'800'},section:{fontSize:20,fontWeight:'700',marginTop:25,marginBottom:10},month:{padding:15,borderWidth:1,borderColor:'#ddd',borderRadius:12,marginBottom:10},monthTitle:{fontWeight:'700'},action:{padding:13,borderRadius:10,borderWidth:1,marginTop:10,alignItems:'center'}});
