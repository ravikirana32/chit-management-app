import React,{useCallback,useEffect,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{chitsApi,agentApi,dashboardApi}from'@/src/api/all';
import{Badge,Button,Card,Loading,Screen,Stat,s}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isCreator,isAgent,isMember,canOperate}from'@/src/state/roles';
import{money,date,errMsg}from'@/src/lib/format';

export default function ChitDetail(){
 const{chitId}=useLocalSearchParams<{chitId:string}>();const{user}=useAuth();
 const[chit,setChit]=useState<any>();const[access,setAccess]=useState<any>();const[dash,setDash]=useState<any>();const[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{if(!chitId)return;try{const r=await chitsApi.get(String(chitId));const d=r.data?.data??r.data;setChit(d);
   try{const x=await dashboardApi.chit(String(chitId));setDash(x.data?.data??x.data)}catch{}
   if(isAgent(user)&&!isCreator(user,d))try{const x=await agentApi.chit(String(chitId));setAccess(x.data?.data??x.data)}catch{}
 }catch(e){Alert.alert('Unable to load',errMsg(e))}},[chitId,user]);
 useEffect(()=>{load()},[load]);
 if(!chit)return <Screen title="Chit" back={()=>router.back()}><Loading/></Screen>;
 const status=String(chit.status||'').toUpperCase();const creator=isCreator(user,chit);
 const manage=canOperate(user,chit,'can_manage_chit',access);const verify=canOperate(user,chit,'can_verify_payments',access);const collect=canOperate(user,chit,'can_collect_cash',access);
 const canSetup=creator||isAdmin(user)||manage;const editableStatus=['DRAFT','INVITING','MEMBERS_CONFIRMED'].includes(status);
 const months=[...(chit.months||[])].sort((a:any,b:any)=>Number(a.month_number)-Number(b.month_number));
 const currentMonth=months.find((m:any)=>!['LOCKED','COMPLETED','CLOSED','CANCELLED'].includes(String(m.status||'').toUpperCase()));
 const currentMonthNumber=currentMonth?Number(currentMonth.month_number):null;
 const hasOpenMonth=!!currentMonth;
 const start=async()=>{setBusy(true);try{await chitsApi.start(String(chit.id));Alert.alert('Chit started',`The chit is now ACTIVE and Month ${currentMonthNumber??''} is ready for operations.`);await load()}catch(e){Alert.alert('Start failed',errMsg(e))}finally{setBusy(false)}};
 return <Screen title={String(chit.name)} subtitle={`${chit.chit_type} · ${status}`} back={()=>router.back()}><ScrollView>
   <View style={s.row}><Stat label="Face" value={money(chit.total_chit_amount)}/><Stat label="Savings" value={money(chit.currentSavings??chit.accumulated_savings_amount)}/></View>
   <View style={s.row}><Stat label="Members" value={chit.total_members}/><Stat label="Progress" value={`${chit.completed_months||0}/${chit.total_months}`}/></View>
   {canSetup&&editableStatus&&<Card><Text style={s.section}>{status==='DRAFT'?'Complete setup and publish':'Chit setup'}</Text><Text style={s.muted}>Review the monthly schedule and publish the chit when all requirements are complete.</Text><Button title={status==='DRAFT'?'Setup & Publish Chit':'Setup / Publish Chit'} onPress={()=>router.push({pathname:'/chit-setup',params:{chitId:String(chit.id)}})}/></Card>}
   {status==='READY_TO_START'&&hasOpenMonth&&<Card><Text style={s.section}>Published — Ready to Start</Text><Text style={s.muted}>{`Configuration is locked. The next available month is Month ${currentMonthNumber}. Start the chit to enable operations for that month.`}</Text><Button title={`Start Chit / Month ${currentMonthNumber}`} onPress={start} disabled={busy}/></Card>}
   {status==='ACTIVE'&&<Card><Text style={s.section}>Chit Active</Text><Text style={s.muted}>Monthly operations are now enabled. Open the current month's Auction, Fixed Draw, or Agent Chit operation as applicable.</Text></Card>}
   <Card><Text style={s.section}>Financial plan</Text><Text>Current savings: {money(chit.currentSavings??chit.accumulated_savings_amount)}</Text><Text style={s.muted}>Every member contributes the scheduled amount. Payout may differ by month. Savings roll forward.</Text></Card>
   {dash?.financial&&<Card><Text style={s.section}>Dashboard</Text><Text>Collected: {money(dash.financial.collected)}</Text><Text>Settled payouts: {money(dash.financial.settled_payouts)}</Text><Text>Outstanding: {money(dash.financial.outstanding)}</Text></Card>}
   <Card><Text style={s.section}>Monthly schedule</Text>{(chit.months||[]).map((m:any)=>{const action=m.month_type==='ACTION';const active=!['LOCKED','COMPLETED','CLOSED','CANCELLED'].includes(String(m.status||'').toUpperCase());const current=currentMonthNumber!==null&&Number(m.month_number)===currentMonthNumber;
     return <Card key={m.id}><View style={s.row}><View style={{flex:1}}><Text style={{fontWeight:'800'}}>Month {m.month_number}{status==='ACTIVE'&&current?' · CURRENT':''}</Text><Text style={s.muted}>{date(m.scheduled_date)} · {money(m.scheduled_amount)} / member</Text><Text style={s.muted}>{m.month_type==='AGENT_CHIT'?'Agent month — no draw/bid':`Action month — ${chit.chit_type==='AUCTION'?'auction':'fixed draw'}`}</Text></View><Badge tone={m.status==='COMPLETED'?'green':'orange'}>{String(m.status)}</Badge></View><Text>Payout: {money(m.winner_payout_amount)}</Text>
       {status==='ACTIVE'&&current&&active&&action&&chit.chit_type==='FIXED_DRAW'&&<Button title="Open / Manage Fixed Draw" secondary onPress={()=>router.push({pathname:'/fixed-draw',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {status==='ACTIVE'&&current&&active&&action&&chit.chit_type==='AUCTION'&&<Button title="Open / Manage Auction" secondary onPress={()=>router.push({pathname:'/auction',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {status==='ACTIVE'&&current&&active&&m.month_type==='AGENT_CHIT'&&<Button title="Agent Month / Settlement" secondary onPress={()=>router.push({pathname:'/agent-month',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {status==='ACTIVE'&&current&&active&&<Button title="Contribution / Payments" secondary onPress={()=>router.push({pathname:'/payment',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {(manage||isAdmin(user)||creator)&&m.status==='COMPLETED'&&<Button title="Reconciliation" secondary onPress={()=>router.push({pathname:'/reconciliation',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {(manage||isAdmin(user)||creator)&&m.status==='COMPLETED'&&<Button title="Close & Lock Month" secondary onPress={()=>router.push({pathname:'/month-close',params:{monthId:String(m.id)}})}/>}
     </Card>})}</Card>
   {manage&&<><Button title="Members & Invitations" secondary onPress={()=>router.push({pathname:'/members',params:{chitId:String(chit.id)}})}/></>}
   {verify&&<Button title="Collections / Verify Payments" secondary onPress={()=>router.push({pathname:'/collections',params:{chitId:String(chit.id)}})}/>}
   {collect&&<Button title="Payouts / Settlement" secondary onPress={()=>router.push({pathname:'/payouts',params:{chitId:String(chit.id)}})}/>}
   {(creator||isAdmin(user)||isAgent(user))&&<Button title="Ledger" secondary onPress={()=>router.push({pathname:'/ledger',params:{chitId:String(chit.id)}})}/>}
   {isMember(user)&&<Button title="My Ledger" secondary onPress={()=>router.push({pathname:'/ledger',params:{chitId:String(chit.id)}})}/>}
   <Button title="Refresh" secondary onPress={load}/>
 </ScrollView></Screen>
}
