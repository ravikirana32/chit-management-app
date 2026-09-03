import React,{useEffect,useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router}from'expo-router';
import{usersApi}from'@/src/api/all';
import{Button,Card,Input,Screen,s,Badge,Select}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin}from'@/src/state/roles';
import{errMsg}from'@/src/lib/format';

const normalize=(v:any)=>String(v??'').trim().toLowerCase();
const getRoles=(user:any):string[]=>{
  const raw=Array.isArray(user?.roles)?user.roles:[];
  return raw.map((r:any)=>typeof r==='string'?r:String(r?.role??r?.name??'')).filter(Boolean).map(normalize);
};
const hasRole=(user:any,role:string)=>getRoles(user).includes(normalize(role));

export default function AdminUsers(){
  const{user}=useAuth();
  const[data,setData]=useState<any[]>([]);
  const[name,setName]=useState('');
  const[mobile,setMobile]=useState('');
  const[email,setEmail]=useState('');
  const[role,setRole]=useState('MEMBER');
  const[busy,setBusy]=useState(false);
  const[search,setSearch]=useState('');
  const[statusFilter,setStatusFilter]=useState('ALL');
  const[roleFilter,setRoleFilter]=useState('ALL');

  const load=()=>usersApi.adminUsers()
    .then(r=>setData(Array.isArray(r.data?.data)?r.data.data:[]))
    .catch(e=>Alert.alert('Unable to load',errMsg(e)));

  useEffect(()=>{if(isAdmin(user))load()},[user]);

  const filtered=useMemo(()=>{
    const q=normalize(search);
    return data.filter((x:any)=>{
      const status=normalize(x?.status||'');
      const matchesStatus=statusFilter==='ALL'||status===normalize(statusFilter);
      const matchesRole=roleFilter==='ALL'||hasRole(x,roleFilter);
      const searchable=[x?.name,x?.mobile,x?.mobile_number,x?.email].map(normalize).join(' ');
      return matchesStatus&&matchesRole&&(!q||searchable.includes(q));
    });
  },[data,search,statusFilter,roleFilter]);

  if(!isAdmin(user))return <Screen title="Access denied"/>;

  const create=async()=>{
    if(!name.trim()||!mobile.trim())return Alert.alert('Name and mobile are required');
    setBusy(true);
    try{
      await usersApi.createUser({name:name.trim(),mobile:mobile.trim(),email:email.trim()||undefined,roles:[role]});
      setName('');setMobile('');setEmail('');
      Alert.alert('User created');
      load();
    }catch(e){Alert.alert('Create failed',errMsg(e))}
    finally{setBusy(false)}
  };

  const clearFilters=()=>{setSearch('');setStatusFilter('ALL');setRoleFilter('ALL')};

  return <Screen title="Users" subtitle="ADMIN only" back={()=>router.back()}>
    <ScrollView keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={s.section}>Search & Filter</Text>
        <Input
          label="Search by name, phone or email"
          value={search}
          onChangeText={setSearch}
          placeholder="e.g. Ravi or 9999999999"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={{flexDirection:'row',gap:10}}>
          <View style={{flex:1}}>
            <Select label="Status" value={statusFilter} options={[
              {label:'All statuses',value:'ALL'},
              {label:'Active',value:'ACTIVE'},
              {label:'Inactive',value:'INACTIVE'},
              {label:'Deleted',value:'DELETED'},
            ]} onChange={setStatusFilter}/>
          </View>
          <View style={{flex:1}}>
            <Select label="Role" value={roleFilter} options={[
              {label:'All roles',value:'ALL'},
              {label:'Members',value:'MEMBER'},
              {label:'Agents',value:'AGENT'},
              {label:'Admins',value:'ADMIN'},
            ]} onChange={setRoleFilter}/>
          </View>
        </View>
        {(search||statusFilter!=='ALL'||roleFilter!=='ALL')&&
          <Button title="Clear Filters" secondary onPress={clearFilters}/>}
        <Text style={[s.muted,{marginTop:5}]}>Showing {filtered.length} of {data.length} users</Text>
      </Card>

      <Card>
        <Text style={s.section}>Create user</Text>
        <Input label="Name" value={name} onChangeText={setName}/>
        <Input label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad"/>
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
        <Select label="Role" value={role} options={[
          {label:'MEMBER',value:'MEMBER'},
          {label:'AGENT',value:'AGENT'},
          {label:'ADMIN',value:'ADMIN'}
        ]} onChange={setRole}/>
        <Button title="Create User" onPress={create} disabled={busy}/>
      </Card>

      {filtered.length===0?
        <Card>
          <Text style={s.section}>No users found</Text>
          <Text style={s.muted}>Try another name/phone number or change the filters.</Text>
        </Card>
      :
        filtered.map(x=><Card key={x.id}>
          <Text style={{fontWeight:'800',fontSize:17}}>{String(x.name||'Unnamed user')}</Text>
          <Text>{String(x.mobile||x.mobile_number||'No phone')} · {String(x.email||'No email')}</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:4}}>
            {getRoles(x).length?
              getRoles(x).map(r=><Badge key={r} tone="purple">{r.toUpperCase()}</Badge>)
              :<Badge tone="neutral">NONE</Badge>}
          </View>
          <Text style={s.muted}>{String(x.status||'UNKNOWN')}</Text>
          <Button title="Edit User" secondary onPress={()=>router.push({pathname:'/edit-user',params:{userId:String(x.id)}})}/>
          {normalize(x.status)!=='deleted'&&<Button title="Delete User" danger onPress={()=>Alert.alert('Delete user?',`This will deactivate ${String(x.name||'this user')} and remove active roles.`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{try{await usersApi.deleteUser(String(x.id));load()}catch(e){Alert.alert('Delete failed',errMsg(e))}}}])}/>}
          {normalize(x.status)==='deleted'&&
            <Text style={[s.muted,{marginTop:5}]}>This user is deleted and cannot be used for new operations.</Text>}
        </Card>)
      }
    </ScrollView>
  </Screen>;
}
