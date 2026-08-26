import {View,Text,FlatList,StyleSheet,ActivityIndicator} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useEffect,useState} from 'react';
import {collectionsApi} from '@/src/api/collections';

export default function CreatorCollections(){
 const {chitId}=useLocalSearchParams<{chitId:string}>();
 const [rows,setRows]=useState<any[]>([]);const [loading,setLoading]=useState(true);
 useEffect(()=>{if(chitId)collectionsApi.overdue(String(chitId)).then(r=>setRows(r.data?.data??r.data??[])).finally(()=>setLoading(false))},[chitId]);
 if(loading)return <View style={styles.center}><ActivityIndicator/></View>;
 return <View style={styles.container}><Text style={styles.title}>Collection Exceptions</Text>
 <FlatList data={rows} keyExtractor={(x:any)=>String(x.id)} ListEmptyComponent={<Text>No overdue/default obligations.</Text>}
  renderItem={({item})=><View style={styles.card}><Text style={styles.name}>{item.name??item.mobile}</Text><Text>Month {item.month_number} • {item.status}</Text><Text>Outstanding ₹{item.outstanding_amount}</Text></View>}/>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},center:{flex:1,justifyContent:'center',alignItems:'center'},title:{fontSize:28,fontWeight:'700',marginBottom:18},card:{padding:16,borderWidth:1,borderColor:'#ddd',borderRadius:12,marginTop:12},name:{fontWeight:'700',fontSize:17}});
