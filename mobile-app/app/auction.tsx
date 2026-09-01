import React,{useEffect,useState}from'react';
import{Alert,ScrollView,Text}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{auctionsApi,chitsApi,agentApi,participantsApi}from'@/src/api/all';
import{Button,Card,Input,Loading,Screen,s,Badge}from'@/src/components/UI';
import{errMsg,money}from'@/src/lib/format';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isCreator,isAgent,isMember,canOperate}from'@/src/state/roles';

export default function Auction(){
 const{chitId,monthId}=useLocalSearchParams<{chitId:string;monthId:string}>();
 const{user}=useAuth(); const[chit,setChit]=useState<any>(); const[state,setState]=useState<any>();
 const[access,setAccess]=useState<any>(); const[members,setMembers]=useState<any[]>([]);
 const[auctionId,setAuctionId]=useState(''); const[bid,setBid]=useState(''); const[busy,setBusy]=useState(false); const[error,setError]=useState('');
 const load=async()=>{
  setError('');
  try{
   const c=await chitsApi.get(String(chitId)); const d=c.data?.data??c.data; setChit(d);
   try{const p=await participantsApi.list(String(chitId));setMembers(p.data?.data??[])}catch{}
   if(isAgent(user)&&!isCreator(user,d))try{const a=await agentApi.chit(String(chitId));setAccess(a.data?.data??a.data)}catch{}
   try{
    const r=await auctionsApi.current(String(chitId),String(monthId),user?.id||'');
    const a=r.data?.data??r.data;
    if(a?.id){setAuctionId(a.id);try{const st=await auctionsApi.state(a.id);setState(st.data?.data??st.data)}catch{setState(a)}}
    else setState(null);
   }catch{setState(null)}
  }catch(e){setError(errMsg(e))}
 };
 useEffect(()=>{load()},[chitId,monthId,user?.id]);
 const operate=canOperate(user,chit,'can_run_auction',access);
 const month=chit?.months?.find((m:any)=>m.id===monthId);
 const open=async()=>{setBusy(true);try{const r=await auctionsApi.open(String(chitId),{chitMonthId:String(monthId),durationMinutes:60});const d=r.data?.data??r.data;setAuctionId(d.id);const st=await auctionsApi.state(d.id);setState(st.data?.data??st.data);Alert.alert('Auction opened','Members can now place bids.')}catch(e){Alert.alert('Open failed',errMsg(e))}finally{setBusy(false)}};
 const refresh=async()=>{if(!auctionId)return;try{const r=await auctionsApi.state(auctionId);setState(r.data?.data??r.data)}catch(e){Alert.alert('Unable to load auction',errMsg(e))}};
 const placeBid=async()=>{if(!user?.participantId)return Alert.alert('Participant profile required','Your member account is not linked to a chit participant.');const n=Number(bid);if(!Number.isFinite(n)||n<0)return Alert.alert('Valid bid required','Enter a non-negative discount.');setBusy(true);try{await auctionsApi.bid(auctionId,{participantId:user.participantId,bidAmount:n});setBid('');await refresh()}catch(e){Alert.alert('Bid failed',errMsg(e))}finally{setBusy(false)}};
 const finalize=async()=>{setBusy(true);try{await auctionsApi.finalize(auctionId);await refresh();Alert.alert('Auction finalized','The winner and payout are now recorded.')}catch(e){Alert.alert('Finalize failed',errMsg(e))}finally{setBusy(false)}};
 if(!chit)return <Screen title="Auction" back={()=>router.back()}><Loading/></Screen>;
 if(error)return <Screen title="Auction" back={()=>router.back()}><Card><Text style={s.danger}>{error}</Text><Button title="Retry" onPress={load}/><Button title="Back" secondary onPress={()=>router.back()}/></Card></Screen>;
 return <Screen title="Auction" subtitle="Bid → winner → payout → savings" back={()=>router.back()}><ScrollView>
  <Card><Text style={s.section}>Month {month?.month_number||'—'}</Text><Text>Contribution per member: {money(month?.scheduled_amount)}</Text><Text style={s.muted}>No fixed payout plan is used. Winner payout = auction amount − winning discount.</Text></Card>
  {operate&&!auctionId&&<Button title="Open Auction" onPress={open} disabled={busy}/>}
  {auctionId&&<Card><Text style={s.section}>Auction state</Text><Badge tone={state?.status==='COMPLETED'?'green':'purple'}>{String(state?.status||'OPEN')}</Badge>
   {state?.winningBid!=null&&<Text>Winning discount: {money(state.winningBid)}</Text>}
   {state?.payoutAmount!=null&&<Text>Winner payout: {money(state.payoutAmount)}</Text>}
   {isMember(user)&&state?.status!=='COMPLETED'&&<><Input label="My bid / discount" value={bid} onChangeText={setBid} keyboardType="decimal-pad"/><Button title="Place Bid" onPress={placeBid} disabled={busy}/></>}
   {operate&&state?.status!=='COMPLETED'&&<><Button title="Refresh Auction" secondary onPress={refresh}/><Button title="Finalize Auction" onPress={finalize} disabled={busy}/></>}
   {state?.winner&&<Card><Text style={s.section}>Winner</Text><Text style={{fontSize:20,fontWeight:'800'}}>{String(state.winner.member_name||'Winner')}</Text><Text style={s.muted}>Mobile: {String(state.winner.member_mobile||'—')}</Text><Text style={s.muted}>Participant: {String(state.winner.participant_sequence||'—')}</Text></Card>}
  </Card>}
  {!auctionId&&state===null&&<Card><Text style={s.muted}>No auction has been opened for this month yet.</Text></Card>}
 </ScrollView></Screen>
}
