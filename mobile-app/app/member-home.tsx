import {View,Text,Pressable,StyleSheet,ScrollView,RefreshControl} from 'react-native';
import {useEffect,useState} from 'react';
import {router} from 'expo-router';
import {chitsApi} from '@/src/api/chits';
import {retry,apiMessage} from '@/src/api/request';
import {cacheGet,cacheSet} from '@/src/cache/json-cache';

export default function MemberHome(){
 const [items,setItems]=useState<any[]>([]);const [error,setError]=useState('');const [refreshing,setRefreshing]=useState(false);
 async function load(){
  try{
   setError('');
   const cached=await cacheGet<any[]>('member-chits');
   if(cached)setItems(cached);
   const r=await retry(()=>chitsApi.listMine());
   const data=r.data?.data??r.data??[];
   const normalized=Array.isArray(data)?data:[];
   setItems(normalized); await cacheSet('member-chits',normalized);
  }
  catch(e){setError(apiMessage(e,'Unable to load your chits'))}
 }
 useEffect(()=>{load()},[]);
 async function refresh(){setRefreshing(true);await load();setRefreshing(false)}
 return <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/>}>
  <Text style={styles.title}>Member Home</Text>
  {error?<View style={styles.error}><Text>{error}</Text><Pressable onPress={load}><Text style={styles.retry}>Retry</Text></Pressable></View>:null}
  {items.map((item:any)=><Pressable key={item.id} style={styles.card} onPress={()=>router.push({pathname:'/chit-details',params:{chitId:item.id}})}>
   <Text style={styles.cardTitle}>{item.name}</Text>
   <Text>{item.chit_type} • {item.status}</Text>
   <View style={styles.row}><Text>Outstanding</Text><Text>₹{item.financial?.outstanding??0}</Text></View>
   <View style={styles.row}><Text>Paid months</Text><Text>{item.financial?.paid_months??0}</Text></View>
   <View style={styles.row}><Text>Wins</Text><Text>{item.wins??0}</Text></View>
  </Pressable>)}
  {!items.length&&!error?<Text style={styles.empty}>No participating chits found.</Text>:null}
 </ScrollView>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:30,fontWeight:'700'},card:{padding:18,borderWidth:1,borderColor:'#ddd',borderRadius:14,marginTop:16},cardTitle:{fontSize:18,fontWeight:'700',marginBottom:6},row:{flexDirection:'row',justifyContent:'space-between',paddingTop:10},empty:{marginTop:30},error:{padding:14,borderRadius:10,backgroundColor:'#fee2e2',marginTop:12},retry:{fontWeight:'700',marginTop:8}});
