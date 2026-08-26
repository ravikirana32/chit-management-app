import NetInfo from '@react-native-community/netinfo';

export async function requireOnline(){
  const state=await NetInfo.fetch();
  if(!state.isConnected) throw new Error('An internet connection is required for financial actions.');
}
