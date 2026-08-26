import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '@/src/store';
import { useEffect } from 'react';
import { bootstrapAuth } from '@/src/store/bootstrap';

export default function RootLayout(){
  useEffect(()=>{bootstrapAuth()},[]);
  return <Provider store={store}><Stack screenOptions={{headerShown:false}} /></Provider>;
}
