import {View,Text,Pressable,StyleSheet,Alert,TextInput,ScrollView} from 'react-native';
import {useState} from 'react';
import {api} from '@/src/api/client';
export default function ImportExistingChit(){
 const [chitId,setChitId]=useState('');const [current,setCurrent]=useState('5');const [status,setStatus]=useState<any>();
 const validate=async()=>{try{const r=await api.post('/v1/chit-import/validate',{chitId,currentMonthNumber:Number(current),members:[],months:[],payments:[]});setStatus(r.data?.data)}catch{Alert.alert('Error','Validation failed')}};
 const draft=async()=>{try{const r=await api.post('/v1/chit-import/create-batch',{chitId,currentMonthNumber:Number(current),members:[],months:[],payments:[]});Alert.alert('Draft created',r.data?.data?.id||'');}catch{Alert.alert('Error','Unable to create import')}};
 return <ScrollView contentContainerStyle={styles.c}><Text style={styles.t}>Import Existing Chit</Text><Text>Chit ID</Text><TextInput style={styles.i} value={chitId} onChangeText={setChitId}/><Text>Current month number</Text><TextInput style={styles.i} keyboardType="number-pad" value={current} onChangeText={setCurrent}/><Pressable style={styles.b} onPress={validate}><Text>Validate Import</Text></Pressable><Pressable style={styles.b} onPress={draft}><Text>Create Import Draft</Text></Pressable>{status&&<Text style={styles.note}>{status.valid?'Ready for review':'Validation errors'}{'\n'}Members: {status.counts.members}{'\n'}Months: {status.counts.months}{'\n'}Payments: {status.counts.payments}</Text>}</ScrollView>
}
const styles=StyleSheet.create({c:{padding:22,paddingTop:55},t:{fontSize:28,fontWeight:'800',marginBottom:20},i:{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:12,marginVertical:8},b:{padding:15,borderWidth:1,borderRadius:10,alignItems:'center',marginTop:10},note:{marginTop:20,lineHeight:22}});
