import React,{useEffect,useState}from'react';
import{ScrollView,Text,View}from'react-native';
import{router,useLocalSearchParams}from'expo-router';
import{ledgerApi,chitsApi,auctionsApi}from'@/src/api/all';
import{Card,Loading,Screen,Stat,s}from'@/src/components/UI';
import{money}from'@/src/lib/format';
import{useAuth}from'@/src/state/Auth';

function LedgerRow({item,index}:{item:any,index:number}){
  const amount=Number(item.amount??item.paidAmount??item.credit??item.debit??0);
  const label=item.description??item.notes??item.transactionType??item.type??item.status??'Transaction';
  return <View style={{paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#eee'}}>
    <View style={s.row}>
      <Text style={{fontWeight:'800',flex:1}}>{String(label)}</Text>
      <Text style={{fontWeight:'800'}}>{money(amount)}</Text>
    </View>
    <Text style={s.muted}>{String(item.date??item.createdAt??item.created_at??'')}</Text>
    {item.status&&<Text style={s.muted}>Status: {String(item.status)}</Text>}
    {item.reference&&<Text style={s.muted}>Reference: {String(item.reference)}</Text>}
  </View>
}

export default function Ledger(){
  const{chitId}=useLocalSearchParams<{chitId:string}>();
  const{user}=useAuth();
  const[data,setData]=useState<any>();
  const[savings,setSavings]=useState<any>();

  useEffect(()=>{
    (async()=>{
      try{
        const c=await chitsApi.get(String(chitId));
        const d=c.data?.data??c.data;
        setData(d);

        if(user?.participantId){
          try{
            const l=await ledgerApi.me(String(chitId),user.participantId);
            setData((x:any)=>({...x,ledger:l.data?.data??l.data}));
          }catch{}
        }else{
          try{
            const l=await ledgerApi.all(String(chitId));
            setData((x:any)=>({...x,ledger:l.data?.data??l.data}));
          }catch{}
        }

        try{
          const a=await auctionsApi.savings(String(chitId));
          setSavings(a.data?.data??a.data);
        }catch{}
      }catch{}
    })();
  },[chitId,user?.participantId]);

  if(!data)return <Screen title="Ledger" back={()=>router.back()}><Loading/></Screen>;

  const ledger=data.ledger;
  const entries=Array.isArray(ledger)
    ? ledger
    : (ledger?.transactions??ledger?.entries??ledger?.items??ledger?.ledger??[]);

  return <Screen title="Ledger" subtitle={data.name} back={()=>router.back()}>
    <ScrollView>
      <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'}}>
        <Stat label="Face amount" value={money(data.total_chit_amount)}/>
        <Stat label="Current savings" value={money(data.currentSavings??data.accumulated_savings_amount)}/>
        <Stat label="Completed" value={`${data.completed_months||0}/${data.total_months}`}/>
        <Stat label="Members" value={data.total_members}/>
      </View>

      {savings&&<Card>
        <Text style={s.section}>Savings</Text>
        <Text>Accumulated: {money(savings.accumulatedSavingsAmount)}</Text>
        <Text>Additional auction eligible: {savings.additionalAuctionEligible?'YES':'NO'}</Text>
      </Card>}

      <Card>
        <Text style={s.section}>Monthly schedule</Text>
        {(data.months||[]).map((m:any)=>
          <View key={m.id} style={[s.row,{paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#eee'}]}>
            <Text>Month {m.month_number}</Text>
            <Text>{m.month_type==='AGENT_CHIT'?'Agent Month':m.status}</Text>
            <Text>{money(m.scheduled_amount)}</Text>
          </View>
        )}
      </Card>

      <Card>
        <Text style={s.section}>Transactions</Text>
        {entries.length
          ? entries.map((item:any,i:number)=><LedgerRow key={item.id??i} item={item} index={i}/>)
          : <Text style={s.muted}>No ledger transactions found.</Text>}
      </Card>
    </ScrollView>
  </Screen>
}
