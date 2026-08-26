import {useEffect,useState} from 'react';
import {View,Text,FlatList,Pressable,StyleSheet,RefreshControl} from 'react-native';
import {api} from '@/src/api/client';

type Dashboard={
 summary:{active_chits:number;members:number;live_chits:number;completed_chits:number};
 chits:any[];
};

export default function AgentDashboard(){
 const [data,setData]=useState<Dashboard|null>(null);
 const [loading,setLoading]=useState(false);

 const load=async()=>{
  setLoading(true);
  try{
   const r=await api.get('/v1/agents/me/dashboard');
   setData(r.data?.data??null);
  }finally{setLoading(false);}
 };

 useEffect(()=>{load()},[]);

 if(!data)return <View style={s.center}><Text>Loading Agent Dashboard...</Text></View>;

 return <View style={s.container}>
  <Text style={s.title}>Agent Dashboard</Text>
  <View style={s.cards}>
   <Stat title="Active Chits" value={data.summary.active_chits}/>
   <Stat title="Live Chits" value={data.summary.live_chits}/>
   <Stat title="Members" value={data.summary.members}/>
   <Stat title="Completed" value={data.summary.completed_chits}/>
  </View>
  <Text style={s.section}>My Chits</Text>
  <FlatList
   data={data.chits}
   keyExtractor={x=>x.id}
   refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}
   renderItem={({item})=><View style={s.chit}>
    <View style={{flex:1}}>
     <Text style={s.name}>{item.name??`Chit ${item.id}`}</Text>
     <Text>{item.member_count} members · {item.status}</Text>
    </View>
    <Text style={s.badge}>{item.can_collect_cash?'Cash ✓':''}</Text>
   </View>}
  />
 </View>
}

function Stat({title,value}:{title:string;value:number}){
 return <View style={s.stat}><Text style={s.value}>{value}</Text><Text>{title}</Text></View>
}

const s=StyleSheet.create({
 container:{flex:1,padding:16,paddingTop:50},
 center:{flex:1,alignItems:'center',justifyContent:'center'},
 title:{fontSize:28,fontWeight:'800',marginBottom:18},
 cards:{flexDirection:'row',flexWrap:'wrap',gap:10},
 stat:{width:'47%',borderWidth:1,borderRadius:12,padding:14},
 value:{fontSize:25,fontWeight:'800'},
 section:{fontSize:20,fontWeight:'700',marginVertical:18},
 chit:{borderWidth:1,borderRadius:12,padding:14,marginBottom:10,flexDirection:'row',alignItems:'center'},
 name:{fontSize:17,fontWeight:'700'},
 badge:{fontSize:12}
});
