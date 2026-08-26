import { View,Text,FlatList,Pressable,StyleSheet } from 'react-native';
import { useEffect,useState } from 'react';
import { notificationsApi } from '@/src/api/notifications';

export default function Notifications(){
 const [items,setItems]=useState<any[]>([]);
 async function load(){const r=await notificationsApi.list();setItems(r.data?.data??r.data??[])}
 useEffect(()=>{load()},[]);
 async function read(id:string){await notificationsApi.read(id);setItems(items.map(x=>x.id===id?{...x,status:'READ'}:x))}
 return <View style={styles.container}><Text style={styles.title}>Notifications</Text>
  <FlatList data={items} keyExtractor={x=>String(x.id)} renderItem={({item})=>
   <Pressable style={styles.card} onPress={()=>read(item.id)}><Text style={styles.cardTitle}>{item.title}</Text><Text>{item.body}</Text><Text>{item.status}</Text></Pressable>}/>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700'},card:{padding:16,borderWidth:1,borderColor:'#ddd',borderRadius:12,marginTop:12},cardTitle:{fontWeight:'700',marginBottom:5}});
