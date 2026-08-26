import {View,Text,Pressable,StyleSheet} from 'react-native';
import {router} from 'expo-router';
export default function Payments(){return <View style={styles.container}><Text style={styles.title}>Payments</Text><Text style={styles.note}>Your monthly obligations and payment history will appear here.</Text><Pressable style={styles.button} onPress={()=>router.push('/payment')}><Text>Make Payment</Text></Pressable></View>}
const styles=StyleSheet.create({container:{padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'800'},note:{marginVertical:20},button:{padding:15,borderWidth:1,borderRadius:10,alignItems:'center'}});
