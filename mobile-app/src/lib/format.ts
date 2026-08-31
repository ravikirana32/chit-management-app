export const money=(v:any)=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const shortMoney=(v:any)=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
export const date=(v:any)=>v?new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
export const unwrap=(r:any)=>r?.data?.data??r?.data??r;
export const errMsg=(e:any,fallback='Something went wrong')=>e?.response?.data?.message??e?.message??fallback;
export const idempotency=()=>`mobile-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
