import {View,Text,Pressable,StyleSheet} from 'react-native';
import {router} from 'expo-router';
export default function Offline(){return <View style={styles.container}><Text style={styles.title}>You're offline</Text><Text style={styles.note}>Financial actions require a connection. Your entered draft data can be reviewed before retrying.</Text><Pressable style={styles.button} onPress={()=>router.back()}><Text>Go Back</Text></Pressable></View>}
const styles=StyleSheet.create({container:{flex:1,alignItems:'center',justifyContent:'center',padding:24},title:{fontSize:26,fontWeight:'800'},note:{textAlign:'center',marginVertical:16},button:{padding:14,borderWidth:1,borderRadius:10}});
