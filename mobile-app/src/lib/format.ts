export const money=(v:any)=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const date=(v:any)=>v?new Date(v).toLocaleDateString('en-IN'):'—';
export const idempotency=()=>`mobile-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
export const errMsg=(e:any)=>e?.response?.data?.message||e?.response?.data?.error||e?.message||'Something went wrong';
