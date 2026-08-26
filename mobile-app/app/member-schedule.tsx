import {View,Text,FlatList,StyleSheet} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useEffect,useState} from 'react';
import {chitsApi} from '@/src/api/chits';

export default function MemberSchedule(){
 const {chitId}=useLocalSearchParams<{chitId:string}>();
 const [data,setData]=useState<any>();
 useEffect(()=>{if(chitId)chitsApi.dashboard(String(chitId)).then(r=>setData(r.data?.data??r.data))},[chitId]);
 const months=data?.months??data?.chit?.months??[];
 return <View style={styles.container}><Text style={styles.title}>Monthly Schedule</Text>
 <FlatList data={months} keyExtractor={(x:any,i)=>String(x.id??i)} ListEmptyComponent={<Text>Monthly schedule will appear here.</Text>}
 renderItem={({item})=><View style={styles.row}><View><Text style={styles.month}>Month {item.month_number}</Text><Text>{item.scheduled_date??item.date}</Text></View><Text>{item.status}</Text></View>}/>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700',marginBottom:18},row:{padding:15,borderBottomWidth:1,borderBottomColor:'#eee',flexDirection:'row',justifyContent:'space-between'},month:{fontWeight:'700'}});
