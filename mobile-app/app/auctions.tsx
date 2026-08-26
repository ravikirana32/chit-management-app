import {View,Text,Pressable,StyleSheet} from 'react-native';
import {router} from 'expo-router';
export default function Auctions(){return <View style={styles.container}><Text style={styles.title}>Auctions</Text><Text style={styles.note}>Open auctions and your active bids.</Text><Pressable style={styles.button} onPress={()=>router.push('/auction')}><Text>Open Auction</Text></Pressable></View>}
const styles=StyleSheet.create({container:{padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'800'},note:{marginVertical:20},button:{padding:15,borderWidth:1,borderRadius:10,alignItems:'center'}});
