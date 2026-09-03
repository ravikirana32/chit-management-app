import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Card, s } from './UI';
import { joinWinnerReveal } from '@/src/realtime/winner-reveal';
import { money } from '@/src/lib/format';

type Props = { kind:'DRAW'|'AUCTION'; id:string; state:any; reload:()=>Promise<void>; payoutAmount?:number; };

export default function WinnerReveal({kind,id,state,reload,payoutAmount}:Props){
  const [now,setNow]=useState(Date.now());
  const [revealed,setRevealed]=useState(Boolean(state?.revealStatus==='REVEALED'));
  const [winner,setWinner]=useState<any>(state?.winner??null);
  const pulse=useRef(new Animated.Value(0)).current;
  const ends=state?.revealEndsAt?new Date(state.revealEndsAt).getTime():0;
  useEffect(()=>setRevealed(String(state?.revealStatus||'').toUpperCase()==='REVEALED'),[state?.revealStatus]);
  useEffect(()=>{ if(revealed)return; const t=setInterval(()=>setNow(Date.now()),250); return()=>clearInterval(t)},[revealed]);
  useEffect(()=>{ if(revealed)return; const t=setInterval(()=>{reload()},2000); return()=>clearInterval(t)},[revealed,reload]);
  useEffect(()=>{ if(revealed)return; const loop=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:true})]));loop.start();return()=>loop.stop()},[revealed]);
  useEffect(()=>{ let cleanup:undefined|(()=>void); joinWinnerReveal(kind,id,async(data)=>{setRevealed(false);await reload()},async(data)=>{setWinner(data?.winner??null);setRevealed(true);await reload()}).then(fn=>cleanup=fn); return()=>cleanup?.()},[kind,id]);
  useEffect(()=>{ if(!revealed&&ends&&now>=ends){ reload(); } },[now,ends,revealed]);
  const remaining=Math.max(0,Math.ceil((ends-now)/1000));
  const scale=1+Number(pulse)*0.08;
  if(!state?.revealStatus||String(state.revealStatus).toUpperCase()==='NONE')return null;
  if(!revealed)return <Card><View style={{alignItems:'center',paddingVertical:18}}><Text style={{fontSize:30}}>🎲</Text><Text style={{fontSize:21,fontWeight:'900',marginTop:6}}>{kind==='AUCTION'?'AUCTION WINNER':'WINNER'} REVEAL</Text><Animated.View style={{transform:[{scale}],marginVertical:18}}><Text style={{fontSize:52,fontWeight:'900'}}>{remaining}</Text></Animated.View><Text style={s.muted}>The winner is securely selected. The result will be revealed when the server countdown ends.</Text></View></Card>;
  return <Card><View style={{alignItems:'center',paddingVertical:20}}><Text style={{fontSize:44}}>🏆</Text><Text style={{fontSize:15,fontWeight:'800',marginTop:8}}>WINNER</Text><Text style={{fontSize:27,fontWeight:'900',marginTop:4}}>{winner?.member_name||state?.winner?.member_name||'Winner'}</Text>{(winner?.member_mobile||state?.winner?.member_mobile)&&<Text style={s.muted}>{winner?.member_mobile||state?.winner?.member_mobile}</Text>}{payoutAmount!=null&&<Text style={{fontSize:24,fontWeight:'900',marginTop:12}}>{money(payoutAmount)}</Text>}<Text style={s.muted}>Congratulations! The winner remains an active member and continues future contributions.</Text></View></Card>;
}
