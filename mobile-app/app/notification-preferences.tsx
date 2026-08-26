import {View,Text,Switch,Pressable,StyleSheet,Alert} from 'react-native';
import {useEffect,useState} from 'react';
import {api} from '@/src/api/client';

const keys=[['paymentReminders','Payment reminders'],['auctionAlerts','Auction alerts'],['winnerAlerts','Winner alerts'],['payoutAlerts','Payout alerts'],['overdueAlerts','Overdue alerts'],['memberUpdates','Member updates'],['pushEnabled','Push notifications']] as const;
export default function NotificationPreferences(){
 const [v,setV]=useState<any>({});
 useEffect(()=>{api.get('/v1/notifications/preferences').then(r=>setV(r.data?.data??{})).catch(()=>{})},[]);
 const save=async()=>{try{await api.put('/v1/notifications/preferences',v);Alert.alert('Saved','Notification preferences updated')}catch{Alert.alert('Error','Unable to save preferences')}};
 return <View style={styles.container}><Text style={styles.title}>Notifications</Text>{keys.map(([k,label])=><View key={k} style={styles.row}><Text>{label}</Text><Switch value={!!v[k]} onValueChange={x=>setV({...v,[k]:x})}/></View>)}<Pressable style={styles.button} onPress={save}><Text>Save</Text></Pressable></View>
}
const styles=StyleSheet.create({container:{padding:22,paddingTop:55},title:{fontSize:28,fontWeight:'800',marginBottom:18},row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#eee'},button:{marginTop:22,padding:15,borderWidth:1,borderRadius:10,alignItems:'center'}});
