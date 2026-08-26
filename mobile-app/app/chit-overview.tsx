import { View,Text,Pressable,StyleSheet,Alert } from 'react-native';
import { useLocalSearchParams,router } from 'expo-router';
import { useState } from 'react';
import { chitsApi } from '@/src/api/chits';

export default function ChitOverview(){
 const {chitId}=useLocalSearchParams<{chitId:string}>(); const [loading,setLoading]=useState(false);
 async function publish(){
  if(!chitId)return; setLoading(true);
  try{await chitsApi.publish(String(chitId));router.replace({pathname:'/chit-details',params:{chitId}})}
  catch(e:any){Alert.alert('Publish failed',e?.response?.data?.message??'Unable to publish')}
  finally{setLoading(false)}
 }
 return <View style={styles.container}><Text style={styles.title}>Review Chit</Text>
  <Text style={styles.item}>Member list: Finalized before publish</Text><Text style={styles.item}>Monthly amount: Configurable before publish</Text>
  <Text style={styles.item}>Payments: UPI / Cash / Bank</Text><Text style={styles.item}>Rules: Locked after publish</Text>
  <Pressable style={styles.button} disabled={loading} onPress={publish}><Text style={styles.buttonText}>{loading?'Publishing…':'Publish Chit'}</Text></Pressable>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700',marginBottom:20},
item:{padding:14,borderBottomWidth:1,borderBottomColor:'#eee'},button:{marginTop:30,padding:15,borderRadius:10,alignItems:'center',backgroundColor:'#111827'},buttonText:{color:'white',fontWeight:'700'}});
