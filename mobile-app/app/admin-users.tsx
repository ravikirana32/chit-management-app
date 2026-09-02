import React,{useEffect,useState}from'react';
import{Alert,ScrollView,Text}from'react-native';
import{router}from'expo-router';
import{usersApi}from'@/src/api/all';
import{Button,Card,Input,Loading,Screen,s,Badge,Select}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin}from'@/src/state/roles';
import{errMsg}from'@/src/lib/format';

export default function AdminUsers(){
 const{user}=useAuth();const[data,setData]=useState<any[]>([]);const[name,setName]=useState('');const[mobile,setMobile]=useState('');const[email,setEmail]=useState('');const[role,setRole]=useState('MEMBER');const[busy,setBusy]=useState(false);const[deleteBusy,setDeleteBusy]=useState<string|null>(null);
 const load=()=>usersApi.adminUsers().then(r=>setData(r.data?.data??[])).catch(e=>Alert.alert('Unable to load',errMsg(e)));
 useEffect(()=>{if(isAdmin(user))load()},[user]);
 if(!isAdmin(user))return <Screen title="Access denied"/>;
 const create=async()=>{if(!name||!mobile)return Alert.alert('Name and mobile are required');setBusy(true);try{await usersApi.createUser({name,mobile,email:email||undefined,roles:[role]});setName('');setMobile('');setEmail('');Alert.alert('User created');load()}catch(e){Alert.alert('Create failed',errMsg(e))}finally{setBusy(false)}};
 const remove=(id:string,name:string)=>Alert.alert('Delete user?',`Delete ${name}? The account will be soft-deleted and historical records retained.`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{setDeleteBusy(id);try{await usersApi.deleteUser(id);Alert.alert('User deleted');load()}catch(e){Alert.alert('Delete failed',errMsg(e))}finally{setDeleteBusy(null)}}}]);
 return <Screen title="Users" subtitle="ADMIN only" back={()=>router.back()}><ScrollView><Card><Text style={s.section}>Create user</Text><Input label="Name" value={name} onChangeText={setName}/><Input label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad"/><Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"/><Select label="Role" value={role} options={[{label:'MEMBER',value:'MEMBER'},{label:'AGENT',value:'AGENT'},{label:'ADMIN',value:'ADMIN'}]} onChange={setRole}/><Button title="Create User" onPress={create} disabled={busy}/></Card>{data.map(x=><Card key={x.id}><Text style={{fontWeight:'800'}}>{x.name}</Text><Text>{x.mobile} · {x.email||'No email'}</Text><Badge tone="purple">{(x.roles||[]).join(', ')||'NONE'}</Badge><Text style={s.muted}>{x.status}</Text><Button title="Edit User" secondary onPress={()=>router.push({pathname:'/edit-user',params:{userId:x.id}})}/><Button title="Delete User" secondary onPress={()=>remove(x.id,x.name||x.mobile)} disabled={deleteBusy===x.id}/></Card>)}</ScrollView></Screen>
}
