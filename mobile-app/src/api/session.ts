import {api,setAccessToken} from './client';
import {tokenStorage} from '@/src/storage/token';

export async function restoreSession(){
  const token=await tokenStorage.get();
  if(!token)return null;
  setAccessToken(token);
  return token;
}

/**
 * Backend-specific refresh endpoint can be wired here once its contract is finalized.
 * We deliberately do not invent a refresh API contract.
 */
export async function clearSession(){
  await tokenStorage.clear();
  setAccessToken('');
}
