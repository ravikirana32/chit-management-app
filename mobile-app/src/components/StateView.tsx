import {View,Text,Pressable,StyleSheet,ActivityIndicator} from 'react-native';
export function LoadingView(){return <View style={styles.center}><ActivityIndicator/></View>}
export function ErrorView({message,onRetry}:{message:string,onRetry?:()=>void}){
 return <View style={styles.box}><Text>{message}</Text>{onRetry?<Pressable onPress={onRetry}><Text style={styles.retry}>Retry</Text></Pressable>:null}</View>
}
const styles=StyleSheet.create({center:{padding:24,alignItems:'center'},box:{padding:14,borderRadius:10,backgroundColor:'#fee2e2'},retry:{fontWeight:'700',marginTop:8}});
