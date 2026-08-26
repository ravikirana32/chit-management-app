import {View,Text,StyleSheet,ScrollView,RefreshControl} from 'react-native';
import {useEffect,useState} from 'react';
import {api} from '@/src/api/client';
import {useLocalSearchParams} from 'expo-router';

export default function Operations(){
 const {chitId}=useLocalSearchParams<{chitId:string}>();const [d,setD]=useState<any>();const [refresh,setRefresh]=useState(false);
 const load=async()=>{if(!chitId)return;setRefresh(true);try{const r=await api.get(`/v1/operations/chits/${chitId}/summary`);setD(r.data?.data)}finally{setRefresh(false)}};
 useEffect(()=>{load()},[chitId]);
 if(!d)return <View style={styles.center}><Text>Loading operations…</Text></View>;
 return <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refresh} onRefresh={load}/>}><Text style={styles.title}>{d.chit.name}</Text>
  <Text style={styles.metric}>Members: {d.collection.total_members}</Text><Text style={styles.metric}>Paid obligations: {d.collection.paid_obligations}</Text><Text style={styles.metric}>Overdue: {d.collection.overdue_obligations}</Text><Text style={styles.metric}>Outstanding: ₹{d.collection.outstanding}</Text>
  <Text style={styles.section}>Monthly operations</Text>{d.months.map((m:any)=><View key={m.id} style={styles.card}><Text style={styles.bold}>Month {m.month_number}</Text><Text>₹{m.scheduled_amount} • {m.status}</Text>{m.month_type==='AGENT_CHIT'&&<Text>Agent month — no draw/bid</Text>}</View>)}
 </ScrollView>
}
const styles=StyleSheet.create({container:{padding:20,paddingTop:55},center:{flex:1,alignItems:'center',justifyContent:'center'},title:{fontSize:26,fontWeight:'800'},metric:{fontSize:17,paddingVertical:6},section:{fontSize:20,fontWeight:'700',marginTop:18,marginBottom:10},card:{padding:14,borderWidth:1,borderColor:'#ddd',borderRadius:12,marginBottom:9},bold:{fontWeight:'700'}});
