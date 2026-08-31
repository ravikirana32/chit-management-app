import React,{useCallback,useEffect,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{chitsApi,agentApi,dashboardApi}from'@/src/api/all';
import{Badge,Button,Card,Loading,Screen,Stat,s}from'@/src/components/UI';
import{useAuth}from'@/src/state/Auth';
import{isAdmin,isCreator,isAgent,isMember,canOperate}from'@/src/state/roles';
import{money,date,errMsg}from'@/src/lib/format';

export default function ChitDetail(){
  const{chitId}=useLocalSearchParams<{chitId:string}>();
  const{user}=useAuth();
  const[chit,setChit]=useState<any>();
  const[access,setAccess]=useState<any>();
  const[dash,setDash]=useState<any>();
  const load=useCallback(async()=>{
    if(!chitId)return;
    try{
      const r=await chitsApi.get(String(chitId));
      const d=r.data?.data??r.data;
      setChit(d);
      try{const x=await dashboardApi.chit(String(chitId));setDash(x.data?.data??x.data)}catch{}
      if(isAgent(user)&&!isCreator(user,d)){
        try{const x=await agentApi.chit(String(chitId));setAccess(x.data?.data??x.data)}catch{}
      }
    }catch(e){Alert.alert('Unable to load',errMsg(e))}
  },[chitId,user]);
  useEffect(()=>{load()},[load]);

  if(!chit)return <Screen title="Chit" back={()=>router.back()}><Loading/></Screen>;

  const creator=isCreator(user,chit);
  const manage=canOperate(user,chit,'can_manage_chit',access);
  const verify=canOperate(user,chit,'can_verify_payments',access);
  const collect=canOperate(user,chit,'can_collect_cash',access);
  const canSetup=creator||isAdmin(user)||manage;

  return <Screen title={String(chit.name)} subtitle={`${chit.chit_type} · ${chit.status}`} back={()=>router.back()}>
    <ScrollView>
      <View style={s.row}>
        <Stat label="Face" value={money(chit.total_chit_amount)}/>
        <Stat label="Savings" value={money(chit.currentSavings??chit.accumulated_savings_amount)}/>
      </View>
      <View style={s.row}>
        <Stat label="Members" value={chit.total_members}/>
        <Stat label="Progress" value={`${chit.completed_months||0}/${chit.total_months}`}/>
      </View>

      {chit.status==='READY_TO_START'&&canSetup&&<Card>
        <Text style={s.section}>Chit is ready to start</Text>
        <Text style={s.muted}>Review the monthly schedule, save any changes, then publish the chit.</Text>
        <Button title="Setup / Publish Chit" onPress={()=>router.push({pathname:'/chit-setup',params:{chitId:String(chit.id)}})}/>
      </Card>}

      <Card>
        <Text style={s.section}>Financial plan</Text>
        <Text>Current savings: {money(chit.currentSavings??chit.accumulated_savings_amount)}</Text>
        <Text style={s.muted}>Every member contributes the scheduled amount. Payout may differ by month. Savings roll forward.</Text>
      </Card>

      {dash?.financial&&<Card>
        <Text style={s.section}>Dashboard</Text>
        <Text>Collected: {money(dash.financial.collected)}</Text>
        <Text>Settled payouts: {money(dash.financial.settled_payouts)}</Text>
        <Text>Outstanding: {money(dash.financial.outstanding)}</Text>
      </Card>}

      <Card>
        <Text style={s.section}>Monthly schedule</Text>
        {(chit.months||[]).map((m:any)=>
          <Card key={m.id}>
            <View style={s.row}>
              <View style={{flex:1}}>
                <Text style={{fontWeight:'800'}}>Month {m.month_number}</Text>
                <Text style={s.muted}>{date(m.scheduled_date)} · {money(m.scheduled_amount)} / member</Text>
                <Text style={s.muted}>{m.month_type==='AGENT_CHIT'?'Agent month — no draw/bid':'Action month — draw/auction'}</Text>
              </View>
              <Badge tone={m.status==='COMPLETED'?'green':'orange'}>{String(m.status)}</Badge>
            </View>
            <Text>Payout: {money(m.winner_payout_amount)}</Text>
            {m.month_type==='ACTION'&&chit.chit_type==='FIXED_DRAW'&&<Button title="Open Fixed Draw" secondary onPress={()=>router.push({pathname:'/fixed-draw',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
            {m.month_type==='ACTION'&&chit.chit_type==='AUCTION'&&<Button title="Open Auction" secondary onPress={()=>router.push({pathname:'/auction',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
            {m.month_type==='AGENT_CHIT'&&<Button title="Agent Month" secondary onPress={()=>router.push({pathname:'/agent-month',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>}
            <Button title="Contribution / Payments" secondary onPress={()=>router.push({pathname:'/payment',params:{chitId:String(chit.id),monthId:String(m.id)}})}/>
          </Card>
        )}
      </Card>

      {manage&&<><Button title="Edit Monthly Schedule" onPress={()=>router.push({pathname:'/chit-setup',params:{chitId:String(chit.id)}})}/><Button title="Members & Invitations" secondary onPress={()=>router.push({pathname:'/members',params:{chitId:String(chit.id)}})}/></>}
      {verify&&<Button title="Collections / Verify Payments" secondary onPress={()=>router.push({pathname:'/collections',params:{chitId:String(chit.id)}})}/>}
      {collect&&<Button title="Payouts / Settlement" secondary onPress={()=>router.push({pathname:'/payouts',params:{chitId:String(chit.id)}})}/>}
      {(creator||isAdmin(user)||isAgent(user))&&<Button title="Ledger" secondary onPress={()=>router.push({pathname:'/ledger',params:{chitId:String(chit.id)}})}/>}
      {isMember(user)&&<Button title="My Ledger" secondary onPress={()=>router.push({pathname:'/ledger',params:{chitId:String(chit.id)}})}/>}
      <Button title="Refresh" secondary onPress={load}/>
    </ScrollView>
  </Screen>
}
