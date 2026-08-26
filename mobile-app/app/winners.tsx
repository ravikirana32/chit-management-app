import {View,Text,FlatList,StyleSheet} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useEffect,useState} from 'react';
import {winnersApi} from '@/src/api/winners';

export default function Winners(){
 const {chitId}=useLocalSearchParams<{chitId:string}>();
 const [fixed,setFixed]=useState<any[]>([]);const [auction,setAuction]=useState<any[]>([]);
 useEffect(()=>{if(chitId){Promise.all([winnersApi.fixed(String(chitId)),winnersApi.auction(String(chitId))]).then(([a,b])=>{setFixed(a.data?.data??a.data??[]);setAuction(b.data?.data??b.data??[])})}},[chitId]);
 const rows=[...fixed.map(x=>({...x,mode:'Fixed Draw'})),...auction.map(x=>({...x,mode:'Auction'}))];
 return <View style={styles.container}><Text style={styles.title}>Winner History</Text>
 <FlatList data={rows} keyExtractor={(x,i)=>String(x.id??i)} renderItem={({item})=><View style={styles.row}>
  <View><Text style={styles.mode}>{item.mode}</Text><Text>{item.member_name??item.name??item.participant_sequence}</Text></View>
  <Text>₹{item.payout_amount??item.amount??'—'}</Text>
 </View>}/>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700'},row:{padding:15,borderBottomWidth:1,borderBottomColor:'#eee',flexDirection:'row',justifyContent:'space-between'},mode:{fontWeight:'700',marginBottom:3}});
