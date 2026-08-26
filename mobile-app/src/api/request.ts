import {AxiosError} from 'axios';

export function apiMessage(error:unknown,fallback='Something went wrong'){
 const e=error as AxiosError<any>;
 return e?.response?.data?.message ?? fallback;
}
export async function retry<T>(fn:()=>Promise<T>,attempts=2,delayMs=500):Promise<T>{
 let last:any;
 for(let i=0;i<attempts;i++){
  try{return await fn()}catch(e){last=e;if(i<attempts-1)await new Promise(r=>setTimeout(r,delayMs*(i+1)))}
 }
 throw last;
}
