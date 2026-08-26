import {useEffect,useState} from 'react';

type Chit={id:string;name?:string;status:string;member_count:number;can_collect_cash:boolean;can_verify_payments:boolean;can_run_draw:boolean;can_run_auction:boolean};
type Data={summary:{active_chits:number;members:number;live_chits:number;completed_chits:number};chits:Chit[]};

export default function AgentDashboard(){
 const [data,setData]=useState<Data|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{fetch('/api/v1/agents/me/dashboard',{credentials:'include'})
  .then(r=>r.ok?r.json():Promise.reject(new Error('Unable to load dashboard')))
  .then(x=>setData(x.data)).catch(e=>setError(e.message));},[]);
 if(error)return <section><h1>Agent Dashboard</h1><p>{error}</p></section>;
 if(!data)return <section><h1>Agent Dashboard</h1><p>Loading...</p></section>;
 return <section aria-label="Agent dashboard">
  <h1>Agent Dashboard</h1>
  <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>
   <Metric label="Active Chits" value={data.summary.active_chits}/>
   <Metric label="Live Chits" value={data.summary.live_chits}/>
   <Metric label="Members" value={data.summary.members}/>
   <Metric label="Completed" value={data.summary.completed_chits}/>
  </div>
  <h2>My Chits</h2>
  <table style={{width:'100%'}}>
   <thead><tr><th>Chit</th><th>Status</th><th>Members</th><th>Permissions</th></tr></thead>
   <tbody>{data.chits.map(c=><tr key={c.id}>
    <td>{c.name??c.id}</td><td>{c.status}</td><td>{c.member_count}</td>
    <td>{[c.can_collect_cash&&'Cash',c.can_verify_payments&&'Verify',c.can_run_draw&&'Draw',c.can_run_auction&&'Auction'].filter(Boolean).join(', ')||'View only'}</td>
   </tr>)}</tbody>
  </table>
 </section>
}
function Metric({label,value}:{label:string;value:number}){return <div style={{border:'1px solid #ddd',borderRadius:12,padding:16}}><strong style={{fontSize:28}}>{value}</strong><div>{label}</div></div>}
