import { View,Text,TextInput,Pressable,StyleSheet,Alert,FlatList } from 'react-native';
import { useLocalSearchParams,router } from 'expo-router';
import { useEffect,useState } from 'react';
import { membersApi } from '@/src/api/members';

export default function Members(){
 const {chitId}=useLocalSearchParams<{chitId?:string}>();
 const [phone,setPhone]=useState(''); const [members,setMembers]=useState<any[]>([]); const [loading,setLoading]=useState(false);
 async function load(){ if(!chitId)return; const r=await membersApi.list(String(chitId)); setMembers(r.data?.data??r.data??[]); }
 useEffect(()=>{load()},[chitId]);
 async function invite(){
  if(!chitId||!phone.trim())return;
  setLoading(true);
  try{await membersApi.invite(String(chitId),{mobile:phone.trim()});setPhone('');await load();}
  catch(e:any){Alert.alert('Invite failed',e?.response?.data?.message??'Unable to invite member')}
  finally{setLoading(false)}
 }
 return <View style={styles.container}>
  <Text style={styles.title}>Members</Text>
  <Text style={styles.subtitle}>Finalize the member list before publishing.</Text>
  <TextInput style={styles.input} placeholder="Member mobile number" value={phone} onChangeText={setPhone}/>
  <Pressable style={styles.secondary} onPress={invite}><Text>{loading?'Adding…':'Invite Member'}</Text></Pressable>
  <FlatList data={members} keyExtractor={(m:any)=>String(m.id)}
   renderItem={({item,index})=><View style={styles.member}><Text>{index+1}. {item.user?.name??item.name??item.mobile}</Text><Text>{item.status}</Text></View>}/>
  <Pressable style={styles.button} onPress={()=>router.push({pathname:'/chit-overview',params:{chitId}})}>
   <Text style={styles.buttonText}>Review & Publish</Text>
  </Pressable>
 </View>
}
const styles=StyleSheet.create({
 container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700'},subtitle:{marginTop:6,marginBottom:20},
 input:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:14},secondary:{padding:14,marginVertical:12,borderWidth:1,borderRadius:10,alignItems:'center'},
 member:{padding:12,borderBottomWidth:1,borderBottomColor:'#eee',flexDirection:'row',justifyContent:'space-between'},
 button:{marginTop:18,padding:15,borderRadius:10,alignItems:'center',backgroundColor:'#111827'},buttonText:{color:'white',fontWeight:'700'}
});
