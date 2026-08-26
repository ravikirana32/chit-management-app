import { View,Text,Pressable,StyleSheet } from 'react-native';
import { router } from 'expo-router';

const types=[
 {key:'FIXED',title:'Fixed Draw Chit',description:'Monthly amount is paid and an eligible member is selected.'},
 {key:'AUCTION',title:'Bid / Auction Chit',description:'Members bid during the scheduled auction window.'},
 {key:'AGENT',title:'Agent Chit Month',description:'A configured month goes to the agent with no draw or bidding.'}
];
export default function CreateChit(){
 return <View style={styles.container}><Text style={styles.title}>Create Chit</Text><Text style={styles.subtitle}>Choose the chit model</Text>
 {types.map(t=><Pressable key={t.key} accessibilityRole="button" testID={`create-type-${t.key}`} style={styles.card} onPress={()=>router.push({pathname:'/chit-setup',params:{type:t.key}})}>
  <Text style={styles.cardTitle}>{t.title}</Text><Text>{t.description}</Text>
 </Pressable>)}</View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:30,fontWeight:'700'},subtitle:{marginTop:6,marginBottom:20},
card:{padding:20,borderWidth:1,borderColor:'#ddd',borderRadius:14,marginBottom:14},cardTitle:{fontSize:18,fontWeight:'700',marginBottom:6}});
