import AsyncStorage from '@react-native-async-storage/async-storage';

export async function cacheSet(key:string,value:any){
 await AsyncStorage.setItem(`cache:${key}`,JSON.stringify({savedAt:Date.now(),value}));
}
export async function cacheGet<T>(key:string,maxAgeMs=24*60*60*1000):Promise<T|null>{
 const raw=await AsyncStorage.getItem(`cache:${key}`);
 if(!raw)return null;
 try{
  const parsed=JSON.parse(raw);
  if(Date.now()-parsed.savedAt>maxAgeMs)return null;
  return parsed.value as T;
 }catch{return null}
}
