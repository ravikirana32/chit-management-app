import React from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,TextInput,View,Modal,ScrollView} from 'react-native';

export const C={bg:'#F7F8FC',card:'#FFF',text:'#172033',muted:'#667085',primary:'#5B3CC4',green:'#16834A',red:'#C62828',border:'#E6E8EF',orange:'#B45309'};

export function Screen({children,title,subtitle,back}:{children:React.ReactNode;title:string;subtitle?:string;back?:()=>void}){
  return <View style={s.screen}>
    <View style={s.header}>
      {back&&<Pressable onPress={back} style={s.back}><Text style={s.backText}>‹</Text></Pressable>}
      <View style={{flex:1}}>
        <Text style={s.title}>{String(title)}</Text>
        {subtitle&&<Text style={s.subtitle}>{String(subtitle)}</Text>}
      </View>
    </View>
    {children}
  </View>
}

/*
 * React Native cannot render raw whitespace strings inside View.
 * Some screens conditionally compose children and JSX can preserve
 * whitespace-only nodes. Filter those nodes at the common Card boundary.
 */
export function Card({children}:{children:React.ReactNode}){
  const safeChildren=React.Children.toArray(children).filter(
    child=>typeof child!=='string'||child.trim().length>0
  );
  return <View style={s.card}>{safeChildren}</View>;
}

export function Button({title,onPress,disabled=false,secondary=false,danger=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;danger?:boolean}){
  return <Pressable disabled={disabled} onPress={onPress} style={[s.button,secondary&&s.secondary,danger&&s.dangerBtn,disabled&&s.disabled]}>
    <Text style={[s.buttonText,secondary&&s.secondaryText]}>{disabled?'Please wait…':String(title)}</Text>
  </Pressable>
}

export function Input({label,...p}:any){
  return <View style={{marginBottom:14}}>
    {label&&<Text style={s.label}>{String(label)}</Text>}
    <TextInput {...p} style={[s.input,p.multiline&&{minHeight:90}]} placeholderTextColor="#98A2B3"/>
  </View>
}

export function Select({label,value,placeholder='Select',options,onChange}:{label?:string;value?:string;placeholder?:string;options:{label:string;value:string}[];onChange:(v:string)=>void}){
  const[open,setOpen]=React.useState(false);
  const selected=options.find(x=>x.value===value)?.label||placeholder;
  return <View style={{marginBottom:14}}>
    {label&&<Text style={s.label}>{String(label)}</Text>}
    <Pressable style={s.input} onPress={()=>setOpen(true)}>
      <Text style={{color:value?C.text:'#98A2B3',fontSize:16}}>{String(selected)}</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
      <Pressable style={s.modalBackdrop} onPress={()=>setOpen(false)}>
        <View style={s.modalCard}>
          <ScrollView>
            {options.map(o=><Pressable key={o.value} onPress={()=>{onChange(o.value);setOpen(false)}} style={s.option}>
              <Text style={{fontSize:16,fontWeight:'700'}}>{String(o.label)}</Text>
            </Pressable>)}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  </View>
}

export const Badge=({children,tone='neutral'}:{children:React.ReactNode;tone?:string})=>
  <View style={[s.badge,tone==='green'&&s.bgGreen,tone==='red'&&s.bgRed,tone==='orange'&&s.bgOrange,tone==='purple'&&s.bgPurple]}>
    <Text style={s.badgeText}>{children}</Text>
  </View>;

export const Stat=({label,value}:any)=>
  <View style={s.stat}><Text style={s.statValue}>{String(value??'—')}</Text><Text style={s.statLabel}>{String(label??'')}</Text></View>;

export const Loading=()=><View style={s.center}><ActivityIndicator size="large" color={C.primary}/><Text style={s.muted}>Loading…</Text></View>;

export const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:C.bg,padding:18,paddingTop:52},header:{flexDirection:'row',alignItems:'center',marginBottom:18},
  back:{width:38,height:38,justifyContent:'center'},backText:{fontSize:34,color:C.text},title:{fontSize:27,fontWeight:'800',color:C.text},
  subtitle:{fontSize:13,color:C.muted,marginTop:3},card:{backgroundColor:C.card,borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:C.border},
  label:{fontSize:13,fontWeight:'700',color:C.text,marginBottom:7},input:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:12,padding:13,fontSize:16,color:C.text},
  button:{backgroundColor:C.primary,borderRadius:12,padding:15,alignItems:'center',marginVertical:5},buttonText:{color:'#fff',fontWeight:'800'},
  secondary:{backgroundColor:'#EFEAFF'},secondaryText:{color:C.primary},dangerBtn:{backgroundColor:C.red},disabled:{opacity:.55},
  badge:{alignSelf:'flex-start',paddingHorizontal:9,paddingVertical:5,borderRadius:99,backgroundColor:'#EEF0F4',marginVertical:3},
  badgeText:{fontSize:11,fontWeight:'800',color:C.text},bgGreen:{backgroundColor:'#E8F7EE'},bgRed:{backgroundColor:'#FDECEC'},
  bgOrange:{backgroundColor:'#FFF3E0'},bgPurple:{backgroundColor:'#EEE8FF'},stat:{width:'48%',backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:15,padding:14,marginBottom:10},
  statValue:{fontSize:22,fontWeight:'800',color:C.text},statLabel:{fontSize:12,color:C.muted,marginTop:4},center:{flex:1,alignItems:'center',justifyContent:'center',gap:10},
  muted:{color:C.muted,fontSize:14},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},section:{fontSize:19,fontWeight:'800',color:C.text,marginTop:8,marginBottom:10},
  danger:{color:C.red,fontWeight:'700'},success:{color:C.green,fontWeight:'700'},modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.35)',justifyContent:'center',padding:24},
  modalCard:{backgroundColor:'#fff',borderRadius:18,maxHeight:'70%',padding:8},option:{padding:16,borderBottomWidth:1,borderBottomColor:C.border}
});
