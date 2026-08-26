import {View,Text,Pressable,StyleSheet} from 'react-native';
import {useAppSelector} from '@/src/store';
import {authApi} from '@/src/api/auth';
import {router} from 'expo-router';

export default function Profile(){
 const user=useAppSelector(s=>s.auth.user);
 async function logout(){await authApi.logout();router.replace('/login')}
 return <View style={styles.container}><Text style={styles.title}>Profile</Text>
  <Text style={styles.item}>Name: {user?.name??'—'}</Text><Text style={styles.item}>Mobile: {user?.mobile??'—'}</Text>
  <Text style={styles.item}>Roles: {user?.roles?.join(', ')??'—'}</Text>
  <Pressable accessibilityRole="button" testID="logout-button" style={styles.button} onPress={logout}><Text style={styles.buttonText}>Logout</Text></Pressable>
 </View>
}
const styles=StyleSheet.create({container:{flex:1,padding:24,paddingTop:60},title:{fontSize:28,fontWeight:'700'},item:{padding:14,borderBottomWidth:1,borderBottomColor:'#eee'},button:{marginTop:30,padding:15,borderRadius:10,backgroundColor:'#111827',alignItems:'center'},buttonText:{color:'white',fontWeight:'700'}});
