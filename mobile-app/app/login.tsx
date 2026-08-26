import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '@/src/api/auth';

export default function Login(){
  const [mobile,setMobile]=useState('');
  const [otp,setOtp]=useState('');
  const [requested,setRequested]=useState(false);
  const [loading,setLoading]=useState(false);

  async function submit(){
    setLoading(true);
    try{
      if(!requested){
        await authApi.requestOtp(mobile);
        setRequested(true);
      }else{
        await authApi.verifyOtp(mobile,otp);
        router.replace('/home');
      }
    }finally{setLoading(false);}
  }

  return <View style={styles.container}>
    <Text style={styles.title}>Chit Funds</Text>
    <Text style={styles.subtitle}>Manage your chit securely</Text>
    <TextInput style={styles.input} accessibilityLabel="Mobile number" testID="login-mobile" placeholder="Mobile number" keyboardType="phone-pad"
      value={mobile} onChangeText={setMobile}/>
    {requested && <TextInput style={styles.input} accessibilityLabel="OTP" testID="login-otp" placeholder="OTP" keyboardType="number-pad"
      value={otp} onChangeText={setOtp}/>}
    <Pressable accessibilityRole="button" accessibilityLabel={requested?'Verify OTP':'Send OTP'} testID="login-submit" style={styles.button} disabled={loading} onPress={submit}>
      <Text style={styles.buttonText}>{requested?'Verify OTP':'Send OTP'}</Text>
    </Pressable>
  </View>
}
const styles=StyleSheet.create({
 container:{flex:1,justifyContent:'center',padding:24},
 title:{fontSize:32,fontWeight:'700',marginBottom:8},
 subtitle:{fontSize:16,marginBottom:28},
 input:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:14,marginBottom:14},
 button:{padding:15,borderRadius:10,alignItems:'center',backgroundColor:'#111827'},
 buttonText:{color:'white',fontWeight:'700'}
});
