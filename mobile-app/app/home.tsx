import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { chitsApi } from '@/src/api/chits';
import { useAppDispatch, useAppSelector } from '@/src/store';
import { setItems, setLoading } from '@/src/store/chitsSlice';

export default function Home(){
 const dispatch=useAppDispatch();
 const {items,loading}=useAppSelector(s=>s.chits);
 useEffect(()=>{
   dispatch(setLoading(true));
   chitsApi.listMine().then(r=>{
     const data=r.data?.data ?? r.data ?? [];
     dispatch(setItems(Array.isArray(data)?data:[]));
   }).finally(()=>dispatch(setLoading(false)));
 },[]);
 return <View style={styles.container}>
   <View style={styles.header}>
    <Text style={styles.title}>My Chits</Text>
    <Pressable onPress={()=>router.push('/create-chit')}><Text style={styles.add}>＋</Text></Pressable>
   </View>
   {loading ? <ActivityIndicator/> :
    <>
    <Pressable style={styles.quick} onPress={()=>router.push('/notifications')}><Text>Notifications</Text></Pressable>
    <Pressable style={styles.quick} onPress={()=>router.push('/profile')}><Text>Profile</Text></Pressable>
    <Pressable style={styles.quick} onPress={()=>router.push('/payment-profile')}><Text>Payment Profile</Text></Pressable>
    <Pressable style={styles.quick} onPress={()=>router.push('/dashboard')}><Text>Dashboard</Text></Pressable>
    <FlatList data={items} keyExtractor={(x:any)=>String(x.id)}
      ListEmptyComponent={<Text style={styles.empty}>No chits yet. Create your first chit.</Text>}
      renderItem={({item})=><Pressable style={styles.card}
        onPress={()=>router.push({pathname:'/chit-details',params:{chitId:item.id}})}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text>{item.chit_type} • {item.status}</Text>
        <Text>Outstanding: ₹{item.financial?.outstanding ?? 0}</Text>
        <Text>Wins: {item.wins ?? 0}</Text>
      </Pressable>}
    />
    </>}
 </View>
}
const styles=StyleSheet.create({
 container:{flex:1,padding:24,paddingTop:60},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 title:{fontSize:30,fontWeight:'700'},add:{fontSize:32},empty:{marginTop:30},quick:{padding:12,borderWidth:1,borderRadius:9,marginTop:10},
 card:{padding:18,borderWidth:1,borderColor:'#ddd',borderRadius:14,marginTop:14},
 cardTitle:{fontSize:18,fontWeight:'700',marginBottom:5}
});
