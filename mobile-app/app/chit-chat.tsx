import {useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,FlatList,StyleSheet} from 'react-native';
import {api} from '@/src/api/client';

export default function ChitChat({chitId}:{chitId:string}){
 const [items,setItems]=useState<any[]>([]);const [message,setMessage]=useState('');
 const load=async()=>{const r=await api.get(`/v1/chits/${chitId}/chat/messages`);setItems(r.data?.data??[])};
 useEffect(()=>{load()},[chitId]);
 const send=async()=>{if(!message.trim())return;await api.post(`/v1/chits/${chitId}/chat/messages`,{message:message.trim()});setMessage('');load()};
 return <View style={s.c}><Text style={s.h}>Chit Chat</Text><FlatList data={items} keyExtractor={x=>x.id} renderItem={({item})=><View style={s.m}><Text style={s.x}>{item.message}</Text><Text style={s.t}>{new Date(item.created_at).toLocaleString()}</Text></View>} /><View style={s.row}><TextInput value={message} onChangeText={setMessage} placeholder="Type a message..." style={s.i}/><Pressable onPress={send} style={s.b}><Text>Send</Text></Pressable></View></View>
}
const s=StyleSheet.create({c:{flex:1,padding:16,paddingTop:50},h:{fontSize:25,fontWeight:'800',marginBottom:12},m:{padding:12,borderWidth:1,borderRadius:10,marginBottom:8},x:{fontSize:16},t:{fontSize:11,marginTop:5},row:{flexDirection:'row',gap:8},i:{flex:1,borderWidth:1,borderRadius:10,padding:10},b:{padding:12,borderWidth:1,borderRadius:10,justifyContent:'center'}});
