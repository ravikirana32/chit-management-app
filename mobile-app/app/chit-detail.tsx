import React,{useCallback,useEffect,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{chitsApi,agentApi,dashboardApi,usersApi}from'@/src/api/all';
import{Badge,Button,Card,Loading,Screen,Stat,s}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isCreator,isAgent,isMember,canOperate}from'@/src/state/roles';
import{money,date,errMsg}from'@/src/lib/format';

const CLOSED_MONTH_STATUSES=new Set(['LOCKED','COMPLETED','CLOSED','CANCELLED']);

export default function ChitDetail(){
 const{chitId}=useLocalSearchParams<{chitId:string}>();const{user}=useAuth();
 const[chit,setChit]=useState<any>();const[access,setAccess]=useState<any>();const[dash,setDash]=useState<any>();const[busy,setBusy]=useState(false);const[deleteBusy,setDeleteBusy]=useState(false);const[expandedMonths,setExpandedMonths]=useState<Record<string,boolean>>({});

 const load=useCallback(async()=>{if(!chitId)return;try{
   const r=await chitsApi.get(String(chitId));const d=r.data?.data??r.data;setChit(d);
   try{const x=await dashboardApi.chit(String(chitId));setDash(x.data?.data??x.data)}catch{}
   if(isAgent(user)&&!isCreator(user,d))try{const x=await agentApi.chit(String(chitId));setAccess(x.data?.data??x.data)}catch{}
 }catch(e){Alert.alert('Unable to load',errMsg(e))}},[chitId,user]);
 useEffect(()=>{load()},[load]);

 if(!chit)return <Screen title="Chit" back={()=>router.back()}><Loading/></Screen>;

 const status=String(chit.status||'').toUpperCase();const creator=isCreator(user,chit);
 const manage=canOperate(user,chit,'can_manage_chit',access);const verify=canOperate(user,chit,'can_verify_payments',access);const collect=canOperate(user,chit,'can_collect_cash',access);
 const canSetup=creator||isAdmin(user)||manage;const editableStatus=['DRAFT','INVITING','MEMBERS_CONFIRMED'].includes(status);
 const months=[...(chit.months||[])].sort((a:any,b:any)=>Number(a.month_number)-Number(b.month_number));
 const currentMonth=months.find((m:any)=>!CLOSED_MONTH_STATUSES.has(String(m.status||'').toUpperCase()));
 const hasOpenMonth=!!currentMonth;
 const start=async()=>{setBusy(true);try{
   await chitsApi.start(String(chit.id));
   Alert.alert('Chit started','The chit is now ACTIVE. The first open month is ready for operations.');
   await load()
 }catch(e){Alert.alert('Start failed',errMsg(e))}finally{setBusy(false)}};
 const deleteDraft=()=>Alert.alert('Delete draft chit?','Only an unstarted draft can be deleted. This cannot be undone.',[
   {text:'Cancel',style:'cancel'},
   {text:'Delete',style:'destructive',onPress:async()=>{setDeleteBusy(true);try{await usersApi.deleteChit(String(chit.id));Alert.alert('Chit deleted');router.back()}catch(e){Alert.alert('Delete failed',errMsg(e))}finally{setDeleteBusy(false)}}}
 ]);

 return <Screen title={String(chit.name)} subtitle={`${chit.chit_type} · ${status}`} back={()=>router.back()}><ScrollView>
   <View style={s.row}><Stat label="Face" value={money(chit.total_chit_amount)}/><Stat label="Savings" value={money(chit.currentSavings??chit.accumulated_savings_amount)}/></View>
   <View style={s.row}><Stat label="Members" value={chit.total_members}/><Stat label="Progress" value={`${chit.completed_months||0}/${chit.total_months}`}/></View>

   {canSetup&&editableStatus&&<Card><Text style={s.section}>{status==='DRAFT'?'Complete setup and publish':'Chit setup'}</Text><Text style={s.muted}>Review the monthly schedule and publish the chit when all requirements are complete.</Text><Button title={status==='DRAFT'?'Setup & Publish Chit':'Setup / Publish Chit'} onPress={()=>router.push({pathname:'/chit-setup',params:{chitId:String(chit.id)}})}/>
   {status==='DRAFT'&&(creator||isAdmin(user))&&<Button title="Delete Draft Chit" secondary onPress={deleteDraft} disabled={deleteBusy}/>}</Card>}

   {status==='READY_TO_START'&&<Card><Text style={s.section}>Published — Ready to Start</Text>
     <Text style={s.muted}>{hasOpenMonth?`Configuration is locked. Month ${currentMonth.month_number} is the first open month.`:'There are no open months remaining.'}</Text>
     {hasOpenMonth?<Button title={`Start Chit / Month ${currentMonth.month_number}`} onPress={start} disabled={busy}/>:<Badge tone="green">All months closed</Badge>}
   </Card>}

   {status==='ACTIVE'&&<Card><Text style={s.section}>Chit Active</Text>
     <Text style={s.muted}>{hasOpenMonth?`Monthly operations are enabled for Month ${currentMonth.month_number}.`:'All monthly operations are complete or locked.'}</Text>
     
   </Card>}

   <Card><Text style={s.section}>Financial plan</Text><Text>Current savings: {money(chit.currentSavings??chit.accumulated_savings_amount)}</Text><Text style={s.muted}>Every member contributes the scheduled amount. Payout may differ by month. Savings roll forward.</Text></Card>
   {dash?.financial&&<Card><Text style={s.section}>Dashboard</Text><Text>Collected: {money(dash.financial.collected)}</Text><Text>Settled payouts: {money(dash.financial.settled_payouts)}</Text><Text>Outstanding: {money(dash.financial.outstanding)}</Text></Card>}

   <Card><Text style={s.section}>Monthly schedule</Text>{months.map((m:any)=>{
     const monthStatus=String(m.status||'').toUpperCase();const closed=CLOSED_MONTH_STATUSES.has(monthStatus);const current=!!currentMonth&&String(m.id)===String(currentMonth.id);const action=m.month_type==='ACTION';
     return <Card key={m.id}><View style={s.row}><View style={{flex:1}}><Text style={{fontWeight:'800'}}>Month {m.month_number}{status==='ACTIVE'&&current?' · CURRENT':''}</Text><Text style={s.muted}>{date(m.scheduled_date)} · {money(m.scheduled_amount)} / member</Text><Text style={s.muted}>{m.month_type==='AGENT_CHIT'?'Agent month — no draw/bid':`Action month — ${chit.chit_type==='AUCTION'?'auction':'fixed draw'}`}</Text></View><Badge tone={monthStatus==='COMPLETED'||monthStatus==='LOCKED'?'green':'orange'}>{monthStatus||'SCHEDULED'}</Badge></View><Text>Payout: {money(m.winner_payout_amount)}</Text>{(closed||status!=='ACTIVE'||!current)&&<Button title={expandedMonths[String(m.id)]?'Hide complete month details':'View complete month details'} secondary onPress={()=>setExpandedMonths(x=>({...x,[String(m.id)]:!x[String(m.id)]}))}/>} {expandedMonths[String(m.id)]&&<Card><Text style={s.section}>Complete month details</Text><Text>Status: {monthStatus||'SCHEDULED'}</Text><Text>Month type: {m.month_type==='AGENT_CHIT'?'Agent month':'Action month'}</Text><Text>Scheduled date: {date(m.scheduled_date)}</Text><Text>Contribution / member: {money(m.scheduled_amount)}</Text><Text>Expected contribution: {money(Number(m.scheduled_amount||0)*Number(chit.total_members||0))}</Text><Text>Verified collections: {money(m.verified_collections)}</Text><Text>Payout configured: {money(m.winner_payout_amount)}</Text>{m.final_payout_amount!=null&&<Text>Final payout: {money(m.final_payout_amount)}</Text>}{m.winner_name&&<Text>Winner: {String(m.winner_name)}</Text>}{m.winner_sequence!=null&&<Text>Winner sequence: {String(m.winner_sequence)}</Text>}{m.winner_mobile&&<Text>Winner mobile: {String(m.winner_mobile)}</Text>}{m.winning_bid!=null&&<Text>Winning bid / discount: {money(m.winning_bid)}</Text>}{m.discount_amount!=null&&<Text>Auction discount: {money(m.discount_amount)}</Text>}{m.auction_status&&<Text>Auction status: {String(m.auction_status)}</Text>}{m.agent_name&&<Text>Agent: {String(m.agent_name)}</Text>}{m.agent_upi_id&&<Text>Agent UPI: {String(m.agent_upi_id)}</Text>}{m.payout_status&&<Text>Payout status: {String(m.payout_status)}</Text>}{m.payout_payment_method&&<Text>Payout method: {String(m.payout_payment_method)}</Text>}{m.payout_transaction_reference&&<Text>Payout reference: {String(m.payout_transaction_reference)}</Text>}{m.payout_paid_at&&<Text>Payout paid at: {String(m.payout_paid_at)}</Text>}{m.locked_at&&<Text>Locked at: {String(m.locked_at)}</Text>}</Card>}
       {status==='ACTIVE'&&current&&!closed&&action&&chit.chit_type==='FIXED_DRAW'&&<Button title="Open / Manage Fixed Draw" secondary onPress={()=>router.push({pathname:'/fixed-draw',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {status==='ACTIVE'&&current&&!closed&&action&&chit.chit_type==='AUCTION'&&<Button title="Open / Manage Auction" secondary onPress={()=>router.push({pathname:'/auction',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {status==='ACTIVE'&&current&&!closed&&m.month_type==='AGENT_CHIT'&&<Button title="Agent Month / Settlement" secondary onPress={()=>router.push({pathname:'/agent-month',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {status==='ACTIVE'&&current&&!closed&&<Button title="Contribution / Payments" secondary onPress={()=>router.push({pathname:'/payment',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {(manage||isAdmin(user)||creator)&&monthStatus==='COMPLETED'&&<Button title="Reconciliation" secondary onPress={()=>router.push({pathname:'/reconciliation',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
       {(manage||isAdmin(user)||creator)&&monthStatus==='COMPLETED'&&<Button title="Close & Lock Month" secondary onPress={()=>router.push({pathname:'/month-close',params:{monthId:String(m.id)}})}/>}
     </Card>
   })}</Card>

   {manage&&<Button title="Members & Invitations" secondary onPress={()=>router.push({pathname:'/members',params:{chitId:String(chit.id)}})}/>}
   {verify&&<Button title="Collections / Verify Payments" secondary onPress={()=>router.push({pathname:'/collections',params:{chitId:String(chit.id)}})}/>}
   {collect&&<Button title="Payouts / Settlement" secondary onPress={()=>router.push({pathname:'/payouts',params:{chitId:String(chit.id)}})}/>}
   {(creator||isAdmin(user)||isAgent(user))&&<Button title="Ledger" secondary onPress={()=>router.push({pathname:'/ledger',params:{chitId:String(chit.id)}})}/>}
   {isMember(user)&&<Button title="My Ledger" secondary onPress={()=>router.push({pathname:'/ledger',params:{chitId:String(chit.id)}})}/>}
   <Button title="Refresh" secondary onPress={load}/>
 </ScrollView></Screen>
}
