import React,{useState}from'react';
import{Alert,Keyboard,KeyboardAvoidingView,Platform,ScrollView,Text,TouchableWithoutFeedback,View}from'react-native';
import{router}from'expo-router';
import{Button,Input,s}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{authApi}from'@/src/api/all';
import{errMsg}from'@/src/lib/format';

export default function Login(){
 const{login}=useAuth();
 const[mobile,setMobile]=useState('');
 const[otp,setOtp]=useState('');
 const[devOtp,setDevOtp]=useState('');
 const[sent,setSent]=useState(false);
 const[testMode,setTestMode]=useState(false);
 const[busy,setBusy]=useState(false);
 const dev=process.env.EXPO_PUBLIC_DEV_LOGIN==='true';

 const request=async()=>{
  Keyboard.dismiss();
  if(mobile.replace(/\D/g,'').length<10)return Alert.alert('Invalid mobile','Enter a valid mobile number');
  setBusy(true);
  try{
   const r=await authApi.requestOtp(mobile.trim());
   const d=r.data?.data??r.data;
   setSent(true);
   setTestMode(d?.testMode===true);
   if(d?.devOtp)setDevOtp(String(d.devOtp));
   Alert.alert('OTP requested',d?.testMode===true?`Test OTP: ${d.devOtp||'1234'}`:'Enter the OTP sent to your mobile.');
  }catch(e){Alert.alert('Unable to request OTP',errMsg(e))}
  finally{setBusy(false)}
 };

 const verify=async(code:string)=>{
  Keyboard.dismiss();
  if(!code.trim())return Alert.alert('OTP required','Enter the OTP');
  setBusy(true);
  try{await login(mobile.trim(),code.trim());router.replace('/dashboard')}
  catch(e){Alert.alert('Login failed',errMsg(e))}
  finally{setBusy(false)}
 };

 return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={s.screen}>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
   <ScrollView
    contentContainerStyle={{paddingBottom:40}}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'}
    showsVerticalScrollIndicator={false}
   >
    <View style={{marginTop:60}}>
     <Text style={s.title}>Chit Management</Text>
     <Text style={[s.subtitle,{fontSize:16,marginBottom:28}]}>Role-aware monthly chit management</Text>
     {(dev||testMode)&&<View style={{padding:14,borderWidth:1,borderRadius:12,marginBottom:18}}>
      <Text style={{fontWeight:'800'}}>DEVELOPMENT MODE</Text>
      <Text style={s.muted}>{testMode?'Server test mode: use OTP 1234.':'OTP is issued and verified through the backend challenge flow.'}</Text>
     </View>}
     <Input label="Mobile number" value={mobile} onChangeText={setMobile} placeholder="+919999999999" keyboardType="phone-pad"/>
     <Button title={sent?'Resend OTP':'Request OTP'} onPress={request} disabled={busy}/>
     {sent&&<>
      <Input label="OTP" value={otp} onChangeText={setOtp} placeholder={devOtp||'Enter OTP'} keyboardType="number-pad"/>
      <Button title="Verify & Login" onPress={()=>verify(otp||(testMode?'1234':devOtp))} disabled={busy}/>
     </>}
    </View>
   </ScrollView>
  </TouchableWithoutFeedback>
 </KeyboardAvoidingView>
}
