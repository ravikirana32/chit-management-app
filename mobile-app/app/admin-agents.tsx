import React,{useEffect,useState}from'react';
import{Alert,ScrollView,Text}from'react-native';
import{router}from'expo-router';
import{usersApi}from'@/src/api/all';
import{Button,Card,Input,Screen,s,Badge,Select}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin}from'@/src/state/roles';
import{errMsg}from'@/src/lib/format';

export default function AdminAgents(){
 const{user}=useAuth();const[data,setData]=useState<any[]>([]);const[users,setUsers]=useState<any[]>([]);const[name,setName]=useState('');const[mobile,setMobile]=useState('');const[userId,setUserId]=useState('');const[busy,setBusy]=useState(false);const[deleteBusy,setDeleteBusy]=useState<string|null>(null);
 const load=async()=>{try{const[a,u]=await Promise.all([usersApi.adminAgents(),usersApi.adminUsers()]);setData(a.data?.data??[]);setUsers((u.data?.data??[]).filter((x:any)=>(x.roles||[]).includes('AGENT')))}catch(e){Alert.alert('Unable to load',errMsg(e))}};
 useEffect(()=>{if(isAdmin(user))load()},[user]);if(!isAdmin(user))return <Screen title="Access denied"/>;
 const create=async()=>{if(!name||!mobile||!userId)return Alert.alert('Name, mobile and user are required');setBusy(true);try{await usersApi.createAgent({name,mobile,userId});setName('');setMobile('');setUserId('');Alert.alert('Agent created');load()}catch(e){Alert.alert('Create failed',errMsg(e))}finally{setBusy(false)}};
 const remove=(id:string,name:string)=>Alert.alert('Deactivate agent?',`Deactivate ${name}? Historical assignments and financial records are retained.`,[{text:'Cancel',style:'cancel'},{text:'Deactivate',style:'destructive',onPress:async()=>{setDeleteBusy(id);try{await usersApi.deleteAgent(id);Alert.alert('Agent deactivated');load()}catch(e){Alert.alert('Delete failed',errMsg(e))}finally{setDeleteBusy(null)}}}]);
 return <Screen title="Agents" subtitle="Manage active agent profiles" back={()=>router.back()}><ScrollView><Card><Text style={s.section}>Create agent profile</Text><Input label="Agent name" value={name} onChangeText={setName}/><Input label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad"/><Select label="Existing AGENT user" value={userId} options={users.map(x=>({label:`${x.name} · ${x.mobile}`,value:x.id}))} onChange={setUserId} placeholder="Select user"/><Button title="Create Agent Profile" onPress={create} disabled={busy}/></Card>{data.map(a=><Card key={a.id}><Text style={{fontWeight:'800'}}>{a.name}</Text><Text>{a.mobile} · {a.email||'—'}</Text><Badge tone={a.status==='ACTIVE'?'green':'red'}>{a.status}</Badge><Text style={s.muted}>Agent ID: {a.id}</Text><Button title="Edit Agent" secondary onPress={()=>router.push({pathname:'/edit-agent',params:{agentId:a.id}})}/>{a.status==='ACTIVE'&&<Button title="Delete / Deactivate Agent" secondary onPress={()=>remove(a.id,a.name)} disabled={deleteBusy===a.id}/>}</Card>)}</ScrollView></Screen>
}
