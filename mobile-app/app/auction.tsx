import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { io,Socket } from 'socket.io-client';
import { auctionsApi } from '@/src/api/auctions';
import { useAppSelector } from '@/src/store';
import { requireOnline } from '@/src/financial/mutation-guard';
import { validateBidAmount } from '@/src/validation/financial';

export default function Auction(){
 const user=useAppSelector(s=>s.auth.user);
 const {auctionId}=useLocalSearchParams<{auctionId:string}>();
 const [bid,setBid]=useState(''); const [state,setState]=useState<any>(); const [events,setEvents]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
   if(!auctionId) return;
   auctionsApi.state(String(auctionId)).then(r=>setState(r.data?.data??r.data)).finally(()=>setLoading(false));
   const url=process.env.EXPO_PUBLIC_SOCKET_URL; if(!url) return;
   const socket:Socket=io(url,{transports:['websocket']});
   socket.emit('auction.join',{auctionId:String(auctionId)});
   socket.on('auction.bid',(data)=>setEvents(e=>[data,...e].slice(0,20)));
   socket.on('auction.state',(data)=>setState(data));
   socket.on('auction.closed',(data)=>setState((s:any)=>({...s,...data})));
   return ()=>{socket.emit('auction.leave',{auctionId:String(auctionId)});socket.disconnect()};
 },[auctionId]);
 async function place(){
   if(!auctionId||!bid) return;
   const check=validateBidAmount(Number(bid),Number(state?.potAmount??Number.MAX_SAFE_INTEGER));
   if(!check.valid)return Alert.alert('Invalid bid',check.message);
   try{await requireOnline();}catch(e:any){return Alert.alert('Offline',e.message);}
   try{
     const r=await auctionsApi.bid(String(auctionId),{participantId:(user as any)?.participantId,bidAmount:Number(bid)});
     setState(r.data?.data??r.data); setBid('');
   }catch(e:any){Alert.alert('Bid rejected',e?.response?.data?.message??'Unable to place bid');}
 }
 if(loading) return <View style={styles.center}><ActivityIndicator/></View>;
 return <View style={styles.container}>
  <Text style={styles.title}>Live Auction</Text>
  <Text style={styles.timer}>Time remaining: {state?.remainingSeconds ?? 0}s</Text>
  <Text style={styles.highest}>Highest discount: ₹{state?.winningBid ?? events[0]?.bidAmount ?? '—'}</Text>
  <TextInput style={styles.input} accessibilityLabel="Bid amount" testID="auction-bid" placeholder="Your bid/discount" keyboardType="decimal-pad" value={bid} onChangeText={setBid}/>
  <Pressable accessibilityRole="button" testID="auction-submit" style={styles.button} onPress={place}><Text style={styles.buttonText}>Place Bid</Text></Pressable>
  <Text style={styles.historyTitle}>Live bids</Text>
  {(events.length?events:state?.bids??[]).map((e:any,i:number)=><Text key={i} style={styles.event}>₹{e.bidAmount??e.bid_amount} • {e.participantId??e.chit_participant_id}</Text>)}
 </View>
}
const styles=StyleSheet.create({
 container:{flex:1,padding:24,paddingTop:60},center:{flex:1,justifyContent:'center',alignItems:'center'},
 title:{fontSize:28,fontWeight:'700'},timer:{fontSize:22,marginTop:16},highest:{marginVertical:16},
 input:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:14},
 button:{marginTop:12,padding:15,borderRadius:10,alignItems:'center',backgroundColor:'#111827'},buttonText:{color:'white',fontWeight:'700'},
 historyTitle:{fontSize:18,fontWeight:'700',marginTop:28},event:{padding:10,borderBottomWidth:1,borderBottomColor:'#eee'}
});
