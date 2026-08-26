import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY='accessToken';
export const tokenStorage={
 get:()=>AsyncStorage.getItem(KEY),
 set:(token:string)=>AsyncStorage.setItem(KEY,token),
 clear:()=>AsyncStorage.removeItem(KEY),
};
