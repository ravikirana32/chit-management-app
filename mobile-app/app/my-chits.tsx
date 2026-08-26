import {View,Text,Pressable,StyleSheet,FlatList,RefreshControl} from 'react-native';
import {useEffect,useState} from 'react';
import {router} from 'expo-router';
import {chitsApi} from '@/src/api/chits';

export default function MyChits(){
 const [items,setItems]=useState<any[]>([]);const [refreshing,setRefreshing]=useState(false);
 const load=async()=>{setRefreshing(true);try{const r=await chitsApi.list();setItems(r.data?.data??r.data??[])}finally{setRefreshing(false)}};
 useEffect(()=>{load()},[]);
 return <View style={styles.container}><Text style={styles.title}>My Chits</Text>
  <FlatList data={items} keyExtractor={x=>x.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load}/>}
   ListEmptyComponent={<Text style={styles.empty}>No chits yet.</Text>}
   renderItem={({item})=><Pressable accessibilityRole="button" testID={`chit-${item.id}`} style={styles.card} onPress={()=>router.push({pathname:'/chit-detail',params:{chitId:item.id}})}>
    <Text style={styles.name}>{item.name}</Text><Text>{item.chit_type} • {item.status}</Text><Text>{item.total_members} members • {item.total_months} months</Text>
   </Pressable>}/>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:20,paddingTop:55},title:{fontSize:28,fontWeight:'800',marginBottom:15},card:{padding:16,borderWidth:1,borderColor:'#ddd',borderRadius:14,marginBottom:10},name:{fontSize:17,fontWeight:'700',marginBottom:5},empty:{paddingTop:30,textAlign:'center'}});
