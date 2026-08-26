import {View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import {router} from 'expo-router';
import {resolveRole} from '@/src/navigation/roles';

const cards=[
 {key:'create',title:'Create Chit',desc:'Create Fixed Draw or Auction chit',route:'/create-chit',creator:true},
 {key:'my-chits',title:'My Chits',desc:'Manage chits and members',route:'/my-chits'},
 {key:'payments',title:'Payments',desc:'Pay, verify and view history',route:'/payments'},
 {key:'auctions',title:'Auctions',desc:'View and place bids',route:'/auctions'},
 {key:'payouts',title:'Payouts',desc:'Track chit winnings and settlements',route:'/payouts'},
 {key:'profile',title:'Profile',desc:'UPI, bank and cash preferences',route:'/profile'}
];

export default function Dashboard(){
 const role=resolveRole(true,true);
 return <ScrollView contentContainerStyle={styles.container}>
  <Text style={styles.title}>Chit Dashboard</Text>
  <Text style={styles.subtitle}>{role==='BOTH'?'Creator + Member':'Member'}</Text>
  <View style={styles.grid}>{cards.filter(c=>!c.creator||role!=='MEMBER').map(c=>
   <Pressable key={c.key} accessibilityRole="button" testID={`dashboard-${c.key}`} style={styles.card} onPress={()=>router.push(c.route as any)}>
    <Text style={styles.cardTitle}>{c.title}</Text><Text style={styles.desc}>{c.desc}</Text>
   </Pressable>)}</View>
 </ScrollView>
}
const styles=StyleSheet.create({container:{padding:20,paddingTop:55},title:{fontSize:30,fontWeight:'800'},subtitle:{marginTop:4,marginBottom:20},grid:{gap:12},card:{padding:18,borderWidth:1,borderColor:'#ddd',borderRadius:16},cardTitle:{fontSize:18,fontWeight:'700'},desc:{marginTop:6}});
