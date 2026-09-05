export const money=(v:any)=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const date=(v:any)=>v?new Date(v).toLocaleDateString('en-IN'):'—';
export const idempotency=()=>`mobile-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
export const errMsg=(e:any):string=>{
 const value=e?.response?.data?.message??e?.response?.data?.error??e?.message;
 if(Array.isArray(value))return value.map((x:any)=>typeof x==='string'?x:x?.message?String(x.message):JSON.stringify(x)).join('\n');
 if(value!==undefined&&value!==null)return typeof value==='string'?value:JSON.stringify(value);
 return 'Something went wrong';
};
