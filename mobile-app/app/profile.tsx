import React,{useState}from'react';
import{Alert,ScrollView,Text}from'react-native';
import{router}from'expo-router';
import{Button,Card,Input,Screen,s}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{usersApi}from'@/src/api/all';
import{errMsg}from'@/src/lib/format';

export default function Profile(){
 const{user,logout}=useAuth();const[name,setName]=useState(user?.name||'');const[language,setLanguage]=useState(user?.preferredLanguage||user?.preferred_language||'en');const[timezone,setTimezone]=useState(user?.timezone||'Asia/Kolkata');const[editing,setEditing]=useState(false);const[busy,setBusy]=useState(false);
 const save=async()=>{if(!name.trim())return Alert.alert('Name required');setBusy(true);try{await usersApi.updateMe({name:name.trim(),preferredLanguage:language.trim(),timezone:timezone.trim()});setEditing(false);Alert.alert('Profile updated')}catch(e){Alert.alert('Update failed',errMsg(e))}finally{setBusy(false)}};
 return <Screen title="Profile" back={()=>router.back()}><ScrollView>
  <Card><Text style={s.section}>{user?.name||'User'}</Text><Text>Mobile: {user?.mobile||'—'}</Text><Text>Roles: {user?.roles?.join(', ')||'MEMBER'}</Text><Text>Participant ID: {user?.participantId||'—'}</Text></Card>
  {editing&&<Card><Text style={s.section}>Edit profile</Text><Input label="Name" value={name} onChangeText={setName}/><Input label="Preferred language" value={language} onChangeText={setLanguage}/><Input label="Timezone" value={timezone} onChangeText={setTimezone}/><Button title="Save Profile" onPress={save} disabled={busy}/><Button title="Cancel" secondary onPress={()=>setEditing(false)}/></Card>}
  {!editing&&<Button title="Edit Profile" onPress={()=>setEditing(true)}/>}
  <Button title="Payment Profile" secondary onPress={()=>router.push('/payment-profile')}/>
  <Button title="Notification Preferences" secondary onPress={()=>router.push('/notification-preferences')}/>
  <Button title="Notifications" secondary onPress={()=>router.push('/notifications')}/>
  <Button title="Logout" danger onPress={async()=>{await logout();router.replace('/login')}}/>
 </ScrollView></Screen>
}
