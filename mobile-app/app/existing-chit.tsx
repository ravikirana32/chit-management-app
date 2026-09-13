import React,{useMemo,useState}from'react';
import{Alert,ScrollView,Text,View}from'react-native';
import{router}from'expo-router';
import{runningChitApi}from'@/src/api/all';
import{Badge,Button,Card,Input,Screen,s}from'@/src/components/UI';
import{errMsg,money}from'@/src/lib/format';

type Member={identifier:string;sequence:number};
type Month={completedAt:string;winner:string;discount:string;notes:string};

const blankMonth=(n:number):Month=>({
  completedAt:'',
  winner:'',
  discount:'',
  notes:'',
});

const isMobile=(v:string)=>/^\+?[0-9 ()-]{7,}$/.test(v.trim());
const num=(v:any)=>Number(v||0);

export default function ExistingChit(){
  const[name,setName]=useState('');
  const[description,setDescription]=useState('');
  const[type,setType]=useState<'FIXED_DRAW'|'AUCTION'>('FIXED_DRAW');
  const[membersCount,setMembersCount]=useState('5');
  const[totalMonths,setTotalMonths]=useState('20');
  const[historicalCount,setHistoricalCount]=useState('4');
  const[startDate,setStartDate]=useState(new Date().toISOString().slice(0,10));
  const[dueDay,setDueDay]=useState('5');
  const[face,setFace]=useState('1000000');
  const[creatorParticipates,setCreatorParticipates]=useState(false);
  const[agentId,setAgentId]=useState('');
  const[members,setMembers]=useState<Member[]>([{identifier:'',sequence:1}]);
  const[chitId,setChitId]=useState('');
  const[current,setCurrent]=useState(1);
  const[months,setMonths]=useState<Record<number,Month>>({});
  const[busy,setBusy]=useState(false);
  const[created,setCreated]=useState(false);
  const[completed,setCompleted]=useState<number[]>([]);

  const nMembers=Math.max(2,Number(membersCount)||2);
  const nMonths=Math.max(2,Number(totalMonths)||2);
  const historicalMonths=Math.max(1,Math.min(nMonths-1,Number(historicalCount)||1));
  const installment=Number(face)>0?Number(face)/nMembers:0;
  const month=months[current]||blankMonth(current);

  const setMonth=(patch:Partial<Month>)=>
    setMonths(x=>({...x,[current]:{...month,...patch}}));

  const updateMember=(i:number,v:string)=>
    setMembers(x=>x.map((m,j)=>j===i?{...m,identifier:v}:m));

  const setMemberCount=(value:string)=>{
    setMembersCount(value);
    const n=Math.max(2,Number(value)||2);
    setMembers(x=>Array.from({length:n},(_,i)=>x[i]||{identifier:'',sequence:i+1}));
  };

  const calculatedDate=(monthNumber:number)=>{
    const date=new Date(startDate);
    date.setMonth(date.getMonth()+monthNumber-1);
    date.setDate(Math.min(28,Math.max(1,Number(dueDay)||1)));
    return date.toISOString().slice(0,10);
  };

  const calculatedPayout=useMemo(()=>{
    if(type==='FIXED_DRAW')return Number(face)||0;
    const discount=num(month.discount);
    return Math.max(0,(Number(face)||0)-discount);
  },[type,face,month.discount]);

  const create=async()=>{
    if(!name.trim())return Alert.alert('Name required','Enter the chit name.');
    if(members.length!==nMembers)return Alert.alert('Members required',`Add exactly ${nMembers} members.`);
    if(members.some(m=>!m.identifier.trim()))
      return Alert.alert('Member required','Every member must have an existing user UUID or mobile number.');
    if(new Set(members.map(m=>m.identifier.trim())).size!==members.length)
      return Alert.alert('Duplicate member','Each member must be unique.');
    if(!Number.isFinite(Number(face))||Number(face)<=0)
      return Alert.alert('Invalid chit amount','Enter a positive total chit amount.');
    setBusy(true);
    try{
      const r=await runningChitApi.create({
        name:name.trim(),
        description:description.trim()||undefined,
        chitType:type,
        totalMembers:nMembers,
        totalMonths:nMonths,
        historicalMonthCount:historicalMonths,
        originalStartDate:startDate,
        dueDay:Math.min(28,Math.max(1,Number(dueDay)||1)),
        totalChitAmount:Number(face).toFixed(2),
        creatorParticipates,
        agentId:agentId.trim()||undefined,
        members:members.map(m=>({
          mobile:isMobile(m.identifier)?m.identifier.trim():undefined,
          userId:isMobile(m.identifier)?undefined:m.identifier.trim(),
          sequence:m.sequence,
        })),
        monthlyAmounts:Array(nMonths).fill(installment.toFixed(2)),
        payoutAmounts:type==='FIXED_DRAW'
          ?Array(nMonths).fill(Number(face).toFixed(2))
          :Array(nMonths).fill(Number(face).toFixed(2)),
      });
      const d=r.data?.data??r.data;
      if(!d?.id)throw new Error(r.data?.message||'Unable to create running chit');
      setChitId(String(d.id));
      setCreated(true);
      setCurrent(1);
      setCompleted([]);
      setMonths({});
      Alert.alert(
        'Running chit created',
        `Now enter only the real historical outcome for each completed month. Collections and financial totals are derived by the backend.`
      );
    }catch(e){
      Alert.alert('Create running chit failed',errMsg(e));
    }finally{setBusy(false)}
  };

  const validateMonth=()=>{
    const errors:string[]=[];
    const date=month.completedAt||calculatedDate(current);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))
      errors.push('Enter the month date as YYYY-MM-DD.');

    if(!month.winner.trim())
      errors.push('Winner is required.');

    const winnerExists=members.some(m=>m.identifier.trim()===month.winner.trim());
    if(!winnerExists)
      errors.push('Winner must match one of the configured member UUIDs/mobile numbers.');

    if(type==='AUCTION'){
      const discount=num(month.discount);
      if(!Number.isFinite(discount)||discount<0||discount>Number(face))
        errors.push('Enter a valid auction discount.');
    }

    if(type==='FIXED_DRAW'&&num(face)<=0)
      errors.push('Invalid chit amount.');

    return errors;
  };

  const buildHistoricalPayments=()=>{
    return members.map(m=>({
      memberId:m.identifier.trim(),
      amount:installment.toFixed(2),
      method:'CASH',
      paymentDate:(month.completedAt||calculatedDate(current)),
      reference:undefined,
      notes:'Historical running-chit payment; default CASH',
    }));
  };

  const finalize=async()=>{
    const errors=validateMonth();
    if(errors.length)return Alert.alert('Review historical month',errors.join('\n'));

    const date=month.completedAt||calculatedDate(current);
    const payout=type==='FIXED_DRAW'
      ?Number(face)
      :Math.max(0,Number(face)-num(month.discount));

    // Commit 09 derives these values again on the server. They are included here
    // only for compatibility with the existing endpoint contract; no financial
    // total is exposed as an editable UI field.
    const collected=installment*nMembers;
    const opening=0;
    const closing=Math.max(0,collected-payout);

    setBusy(true);
    try{
      const r=await runningChitApi.finalize(chitId,String(current),{
        contributionPerMember:installment.toFixed(2),
        completedAt:date,
        openingSavings:opening.toFixed(2),
        collectedAmount:collected.toFixed(2),
        winnerMemberId:month.winner.trim(),
        payoutAmount:payout.toFixed(2),
        discountAmount:type==='AUCTION'?num(month.discount).toFixed(2):'0.00',
        winnerReference:undefined,
        notes:month.notes.trim()||undefined,
        payoutComponents:[{
          amount:payout.toFixed(2),
          method:'CASH',
          reference:undefined,
          notes:'Historical payout default CASH',
        }],
        payments:buildHistoricalPayments(),
      });

      if(!r.data?.success)
        throw new Error(r.data?.message||'Finalize failed');

      setCompleted(x=>x.includes(current)?x:[...x,current]);

      if(current<historicalMonths){
        const next=current+1;
        setCurrent(next);
        setMonths(x=>({...x,[next]:blankMonth(next)}));
        Alert.alert(
          `Month ${current} locked`,
          `Historical Month ${current} is finalized and locked. Continue with Month ${next}.`
        );
      }else{
        const takeover=historicalMonths+1;
        setCurrent(takeover);
        setMonths(x=>({...x,[takeover]:x[takeover]||blankMonth(takeover)}));
        Alert.alert(
          'Historical entry complete',
          `Months 1-${historicalMonths} are locked. Month ${takeover} is the first LIVE month.`
        );
      }
    }catch(e){
      Alert.alert(`Finalize Month ${current} failed`,errMsg(e));
    }finally{setBusy(false)}
  };

  const activate=async()=>{
    if(completed.length!==historicalMonths)
      return Alert.alert(
        'Historical months incomplete',
        `Finalize all ${historicalMonths} historical month(s) before activation.`
      );

    setBusy(true);
    try{
      const takeover=historicalMonths+1;
      const r=await runningChitApi.activate(chitId,String(takeover));
      if(!r.data?.success)
        throw new Error(r.data?.message||'Activation failed');

      Alert.alert(
        'Running chit activated',
        `Month ${takeover} is now a normal LIVE month. Historical months remain locked.`,
        [{text:'Open chit',onPress:()=>router.replace({pathname:'/chit-detail',params:{chitId}})}]
      );
    }catch(e){
      Alert.alert('Activation failed',errMsg(e));
    }finally{setBusy(false)}
  };

  const progress=`${completed.length}/${historicalMonths} historical months locked`;

  return <Screen
    title="Running Chit Onboarding"
    subtitle={created?`Historical Month ${current} · ${progress}`:'Create a chit that already started outside the app'}
    back={()=>router.back()}
  >
    <ScrollView keyboardShouldPersistTaps="handled">

      {!created&&<>
        <Card>
          <Text style={s.section}>1 · Running chit basics</Text>
          <Text style={s.muted}>
            Create the chit in the app and tell us how many months were already completed outside the app.
            Only historical outcome data is entered afterward.
          </Text>

          <Input label="Chit name" value={name} onChangeText={setName}/>
          <Input label="Description" value={description} onChangeText={setDescription} multiline/>

          <View style={s.row}>
            <Button title="FIXED DRAW" secondary={type!=='FIXED_DRAW'} onPress={()=>setType('FIXED_DRAW')}/>
            <Button title="AUCTION" secondary={type!=='AUCTION'} onPress={()=>setType('AUCTION')}/>
          </View>

          <View style={s.row}>
            <View style={{flex:1}}>
              <Input label="Members" value={membersCount} onChangeText={setMemberCount} keyboardType="number-pad"/>
            </View>
            <View style={{flex:1}}>
              <Input label="Total months" value={totalMonths} onChangeText={setTotalMonths} keyboardType="number-pad"/>
            </View>
          </View>

          <Input
            label="Completed months outside the app"
            value={historicalCount}
            onChangeText={setHistoricalCount}
            keyboardType="number-pad"
          />

          <Text style={s.muted}>
            Example: 4 completed months means Month 5 becomes the LIVE takeover month.
          </Text>

          <Input label="Total chit amount" value={face} onChangeText={setFace} keyboardType="decimal-pad"/>
          <Input label="Original start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate}/>
          <Input label="Due day" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad"/>

          <Card>
            <Text style={{fontWeight:'800'}}>Backend historical defaults</Text>
            <Text style={s.muted}>
              Contribution: {money(installment)} per member/month
            </Text>
            <Text style={s.muted}>Historical payment: CASH</Text>
            <Text style={s.muted}>Historical payment date: month date</Text>
            <Text style={s.muted}>Historical payout: CASH</Text>
          </Card>

          <Input
            label="Responsible agent UUID (optional; logged-in agent is auto-resolved)"
            value={agentId}
            onChangeText={setAgentId}
          />

          <Button
            title={creatorParticipates?'Creator participates: YES':'Creator participates: NO'}
            secondary
            onPress={()=>setCreatorParticipates(v=>!v)}
          />
        </Card>

        <Card>
          <Text style={s.section}>2 · Existing members</Text>
          <Text style={s.muted}>
            Enter an existing application user's UUID or mobile number. No invitation or live payment workflow is triggered.
          </Text>

          {members.map((m,i)=>
            <Input
              key={i}
              label={`Member ${i+1}`}
              value={m.identifier}
              onChangeText={v=>updateMember(i,v)}
              placeholder="User UUID or mobile"
            />
          )}
        </Card>

        <Button title="Create Running Chit & Generate Schedule" onPress={create} disabled={busy}/>
      </>}

      {created&&<>
        <Card>
          <View style={s.row}>
            <Text style={s.section}>Historical onboarding</Text>
            <Badge tone="green">RUNNING CHIT</Badge>
          </View>
          <Text>Chit ID: {chitId}</Text>
          <Text>Total members: {nMembers}</Text>
          <Text>Total months: {nMonths}</Text>
          <Text>Historical months: {historicalMonths}</Text>
          <Text>Takeover month: {historicalMonths+1}</Text>
          <Text style={s.muted}>
            {progress}. Historical months are direct-entry history and remain locked after finalization.
          </Text>
        </Card>

        {current<=historicalMonths&&
          <Card>
            <View style={s.row}>
              <Text style={s.section}>Historical Month {current}</Text>
              <Badge tone="purple">HISTORICAL</Badge>
            </View>

            <Text style={s.muted}>
              Enter only what actually happened. Collection, savings, and payout totals are calculated by the backend.
            </Text>

            <Input
              label="Month date (YYYY-MM-DD)"
              value={month.completedAt}
              onChangeText={v=>setMonth({completedAt:v})}
              placeholder={calculatedDate(current)}
            />

            <Input
              label="Winner UUID/mobile"
              value={month.winner}
              onChangeText={v=>setMonth({winner:v})}
              placeholder="Existing member"
            />

            {type==='FIXED_DRAW'
              ? <Card>
                  <Text style={{fontWeight:'800'}}>Fixed Draw payout</Text>
                  <Text style={{fontSize:22,fontWeight:'900'}}>{money(Number(face)||0)}</Text>
                  <Text style={s.muted}>Derived automatically from the chit amount. No payout amount entry is required.</Text>
                </Card>
              : <Card>
                  <Text style={s.section}>Auction outcome</Text>
                  <Input
                    label="Auction discount"
                    value={month.discount}
                    onChangeText={v=>setMonth({discount:v})}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.muted}>
                    Derived payout: {money(calculatedPayout)}
                  </Text>
                </Card>
            }

            <Input
              label="Notes (optional)"
              value={month.notes}
              onChangeText={v=>setMonth({notes:v})}
              multiline
            />

            <Card>
              <Text style={{fontWeight:'800'}}>Automatic historical accounting</Text>
              <Text style={s.muted}>
                {nMembers} member payments × {money(installment)} = {money(installment*nMembers)} collection
              </Text>
              <Text style={s.muted}>Payment method: CASH</Text>
              <Text style={s.muted}>Payment date: {month.completedAt||calculatedDate(current)}</Text>
              <Text style={s.muted}>Payout method: CASH</Text>
            </Card>

            <Button
              title={`Finalize & Lock Historical Month ${current}`}
              onPress={finalize}
              disabled={busy}
            />
          </Card>
        }

        {current>historicalMonths&&
          <Card>
            <Text style={s.section}>Historical onboarding complete</Text>
            <Badge tone="green">ALL HISTORICAL MONTHS LOCKED</Badge>
            <Text style={{marginTop:8}}>
              Months 1-{historicalMonths} are permanently historical.
            </Text>
            <Text style={s.muted}>
              Month {historicalMonths+1} is the first LIVE month. Activate it only after confirming the historical data.
            </Text>
            <Button title={`Activate Live Month ${historicalMonths+1}`} onPress={activate} disabled={busy}/>
          </Card>
        }
      </>}

    </ScrollView>
  </Screen>;
}
