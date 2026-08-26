import {View,Text,FlatList,StyleSheet,ActivityIndicator} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useEffect,useState} from 'react';
import {ledgerApi} from '@/src/api/ledger';

export default function Ledger(){
 const {chitId,participantId}=useLocalSearchParams<{chitId:string,participantId:string}>();
 const [rows,setRows]=useState<any[]>([]);const [loading,setLoading]=useState(true);
 useEffect(()=>{if(chitId&&participantId)ledgerApi.participant(String(chitId),String(participantId)).then(r=>setRows(r.data?.data??r.data??[])).finally(()=>setLoading(false))},[chitId,participantId]);
 if(loading)return <View style={styles.center}><ActivityIndicator/></View>;
 return <View style={styles.container}><Text style={styles.title}>My Ledger</Text>
  <FlatList data={rows} keyExtractor={x=>String(x.id)} renderItem={({item})=>
   <View style={styles.row}><View><Text style={styles.type}>{item.entry_type}</Text><Text>{item.description}</Text></View><Text>₹{Number(item.amount).toFixed(2)}</Text></View>}/>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},center:{flex:1,justifyContent:'center',alignItems:'center'},title:{fontSize:28,fontWeight:'700',marginBottom:18},row:{padding:14,borderBottomWidth:1,borderBottomColor:'#eee',flexDirection:'row',justifyContent:'space-between'},type:{fontWeight:'700'}});
