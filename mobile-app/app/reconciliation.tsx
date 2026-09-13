import React,{useEffect,useState}from'react';
import{ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{reconciliationApi}from'@/src/api/all';
import{Card,Loading,Screen,Stat,s}from'@/src/components/UI';
import{money,errMsg}from'@/src/lib/format';

const n=(v:any)=>Number(v??0);

export default function Reconciliation(){
  const{chitId,monthId}=useLocalSearchParams<{chitId:string;monthId?:string}>();
  const[data,setData]=useState<any>();
  const[error,setError]=useState('');

  useEffect(()=>{
    (async()=>{
      try{
        const c=String(chitId);
        const r=monthId
          ?await reconciliationApi.monthly(c,String(monthId))
          :await reconciliationApi.summary(c);
        setData(r.data?.data??r.data);
      }catch(e){setError(errMsg(e))}
    })();
  },[chitId,monthId]);

  if(!data&&!error)
    return <Screen title="Reconciliation" subtitle="Monthly financial reconciliation" back={()=>router.back()}><Loading/></Screen>;

  if(error)
    return <Screen title="Reconciliation" back={()=>router.back()}><Card><Text style={s.danger}>{String(error)}</Text></Card></Screen>;

  if(monthId){
    const collected=n(data.verifiedCollections??data.collected);
    const expected=n(data.expectedCollections??data.expected_collections);
    const payout=n(data.payout??data.settled_payout??data.paid_out);
    const outstanding=n(data.outstanding);
    const paidMembers=n(data.paid_members??data.paidMembers);
    const overdueMembers=n(data.overdue_members??data.overdueMembers);
    const ledgerNet=n(data.ledgerNet??data.ledger_net);
    const closing=n(data.closingSavings??data.closing_savings);
    const opening=n(data.openingSavings??data.opening_savings);
    const balanced=data.balanced;

    return <Screen title="Reconciliation" subtitle="Monthly financial reconciliation" back={()=>router.back()}>
      <ScrollView>
        <Card>
          <Text style={s.section}>{`Month ${String(data.month_number??'—')}`}</Text>
          <View style={s.row}>
            <Stat label="Expected" value={money(expected)}/>
            <Stat label="Collected" value={money(collected)}/>
          </View>
          <View style={s.row}>
            <Stat label="Payout settled" value={money(payout)}/>
            <Stat label="Outstanding" value={money(outstanding)}/>
          </View>
          <View style={s.row}>
            <Stat label="Paid members" value={String(paidMembers)}/>
            <Stat label="Overdue" value={String(overdueMembers)}/>
          </View>
          <Text style={s.muted}>{`Status: ${String(data.status||'—')}`}</Text>
        </Card>

        <Card>
          <Text style={s.section}>Financial checks</Text>
          <Text>Opening savings: {money(opening)}</Text>
          <Text>Closing savings: {money(closing)}</Text>
          <Text>Ledger net: {money(ledgerNet)}</Text>
          <Text style={s.muted}>{`Collections recorded: ${data.checks?.collectionsRecorded?'YES':'NO'}`}</Text>
          <Text style={s.muted}>{`Payout within funds: ${data.checks?.payoutWithinAvailableFunds?'YES':'NO'}`}</Text>
          <Text style={s.muted}>{`Savings continuity: ${data.checks?.savingsContinuity?'YES':'NO'}`}</Text>
          <Text style={s.muted}>{`Ledger balanced: ${data.checks?.ledgerBalanced?'YES':'NO'}`}</Text>
          <Text style={s.muted}>{`Month closed: ${data.checks?.monthClosed?'YES':'NO'}`}</Text>
          <Text style={{fontWeight:'800',marginTop:8}}>{balanced?'RECONCILED':'REVIEW REQUIRED'}</Text>
        </Card>
      </ScrollView>
    </Screen>;
  }

  const financial=data.financial??data;
  return <Screen title="Reconciliation" subtitle="Chit financial summary" back={()=>router.back()}>
    <ScrollView>
      <Card>
        <Text>Expected collections: {money(financial.expected_collections??financial.expectedCollections)}</Text>
        <Text>Collected: {money(financial.collected??financial.verifiedCollections)}</Text>
        <Text>Paid out: {money(financial.paid_out??financial.payout)}</Text>
        <Text>Outstanding: {money(financial.outstanding)}</Text>
      </Card>
    </ScrollView>
  </Screen>;
}
