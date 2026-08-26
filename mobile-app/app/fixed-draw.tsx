import { View,Text,Pressable,StyleSheet,Alert,ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect,useState } from 'react';
import { drawsApi } from '@/src/api/draws';

export default function FixedDraw(){
 const {chitId,monthId}=useLocalSearchParams<{chitId:string,monthId:string}>();
 const [data,setData]=useState<any>(); const [loading,setLoading]=useState(true); const [executing,setExecuting]=useState(false);
 async function load(){if(!chitId)return; const r=await drawsApi.current(String(chitId));setData(r.data?.data??r.data)}
 useEffect(()=>{load().finally(()=>setLoading(false))},[chitId]);
 async function execute(){
  if(!chitId||!monthId)return Alert.alert('Missing month','Select the current chit month');
  setExecuting(true);
  try{const r=await drawsApi.execute(String(chitId),String(monthId));setData(r.data?.data??r.data);Alert.alert('Draw complete','The selected winner is now recorded.')}
  catch(e:any){Alert.alert('Draw failed',e?.response?.data?.message??'Unable to execute draw')}
  finally{setExecuting(false)}
 }
 if(loading)return <View style={styles.center}><ActivityIndicator/></View>;
 return <View style={styles.container}><Text style={styles.title}>Fixed Draw</Text>
  <Text style={styles.note}>Eligible members only. Previous winners are excluded according to chit rules.</Text>
  {data?.winner&&<View style={styles.winner}><Text style={styles.winnerTitle}>Winner</Text><Text>{data.winner.name??data.winner.participant_sequence}</Text></View>}
  <Pressable accessibilityRole="button" testID="fixed-draw-submit" style={styles.button} onPress={execute} disabled={executing}><Text style={styles.buttonText}>{executing?'Selecting…':'Select Winner'}</Text></Pressable>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},center:{flex:1,justifyContent:'center',alignItems:'center'},title:{fontSize:28,fontWeight:'700'},
note:{marginVertical:18,padding:14,backgroundColor:'#f3f4f6',borderRadius:10},winner:{padding:20,borderWidth:1,borderRadius:14},winnerTitle:{fontSize:18,fontWeight:'700',marginBottom:8},
button:{marginTop:24,padding:15,borderRadius:10,alignItems:'center',backgroundColor:'#111827'},buttonText:{color:'white',fontWeight:'700'}});
