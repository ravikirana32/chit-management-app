import {View,Text,StyleSheet} from 'react-native';
export default function Payouts(){return <View style={styles.container}><Text style={styles.title}>Payouts</Text><Text style={styles.note}>Track pending, processing and settled chit payouts.</Text></View>}
const styles=StyleSheet.create({container:{padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'800'},note:{marginTop:20}});
