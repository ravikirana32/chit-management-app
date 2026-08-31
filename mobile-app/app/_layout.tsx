import React from 'react';import{Stack}from'expo-router';import{AuthProvider}from'@/src/state/Auth';
export default function Layout(){return <AuthProvider><Stack screenOptions={{headerShown:false}}/></AuthProvider>}
