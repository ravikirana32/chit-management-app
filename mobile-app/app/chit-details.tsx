import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect,useState } from 'react';
import { chitsApi } from '@/src/api/chits';

export default function ChitDetails(){
 const {chitId}=useLocalSearchParams<{chitId:string}>();
 const [data,setData]=useState<any>(); const [loading,setLoading]=useState(true);
 useEffect(()=>{ if(chitId) chitsApi.dashboard(String(chitId)).then(r=>setData(r.data?.data??r.data)).finally(()=>setLoading(false)); },[chitId]);
 if(loading) return <View style={styles.center}><ActivityIndicator/></View>;
 const f=data?.financial??{};
 return <View style={styles.container}>
  <Text style={styles.title}>{data?.chit?.name ?? 'Chit Dashboard'}</Text>
  <View style={styles.row}><Text>Progress</Text><Text>{data?.progress?.percentage ?? 0}%</Text></View>
  <View style={styles.row}><Text>Collected</Text><Text>₹{f.collected ?? 0}</Text></View>
  <View style={styles.row}><Text>Outstanding</Text><Text>₹{f.outstanding ?? 0}</Text></View>
  <View style={styles.row}><Text>Completed months</Text><Text>{f.completed_months ?? data?.progress?.completedMonths ?? 0}</Text></View>
  <Pressable style={styles.card} onPress={()=>router.push({pathname:'/payment',params:{chitId}})}>
   <Text style={styles.cardTitle}>Monthly Payment</Text><Text>Pay / record your contribution</Text>
  </Pressable>
  <Pressable style={styles.card} onPress={()=>router.push({pathname:'/auction',params:{auctionId:data?.auctions?.[0]?.id}})}>
   <Text style={styles.cardTitle}>Auction</Text><Text>Open live auction when available</Text>
  </Pressable>
 </View>
}
const styles=StyleSheet.create({
 container:{flex:1,padding:24,paddingTop:60},center:{flex:1,justifyContent:'center',alignItems:'center'},
 title:{fontSize:28,fontWeight:'700',marginBottom:20},
 row:{flexDirection:'row',justifyContent:'space-between',padding:14,borderBottomWidth:1,borderBottomColor:'#eee'},
 card:{padding:18,borderWidth:1,borderColor:'#ddd',borderRadius:14,marginTop:14},cardTitle:{fontWeight:'700',fontSize:17,marginBottom:5}
});
