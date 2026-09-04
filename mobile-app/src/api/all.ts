import{api}from'./client';

export const authApi={
 requestOtp:(mobile:string)=>api.post('/v1/auth/request-otp',{mobile}),
 verify:(mobile:string,otp:string)=>api.post('/v1/auth/verify-otp',{mobile,otp}),
 verifyOtp:(mobile:string,otp:string)=>api.post('/v1/auth/verify-otp',{mobile,otp}),
 refresh:(refreshToken:string)=>api.post('/v1/auth/refresh',{refreshToken}),
 logout:(refreshToken:string)=>api.post('/v1/auth/logout',{refreshToken}),
};

export const dashboardApi={
 me:()=>api.get('/v1/dashboard/me'),
 chit:(id:string)=>api.get(`/v1/dashboard/chits/${id}`),
 agent:()=>api.get('/v1/agents/me/dashboard'),
};

export const usersApi={
 adminUsers:()=>api.get('/v1/admin/users'),
 createUser:(p:any)=>api.post('/v1/admin/users',p),
 getUser:(id:string)=>api.get(`/v1/admin/users/${id}`),
 updateUser:(id:string,p:any)=>api.put(`/v1/admin/users/${id}`,p),
 deleteUser:(id:string)=>api.delete(`/v1/admin/users/${id}`),
 roles:(id:string)=>api.get(`/v1/admin/users/${id}/roles`),
 addRole:(id:string,role:string)=>api.post(`/v1/admin/users/${id}/roles`,{role}),
 setRoles:(id:string,roles:string[])=>api.put(`/v1/admin/users/${id}/roles`,{roles}),
 removeRole:(id:string,role:string)=>api.delete(`/v1/admin/users/${id}/roles/${encodeURIComponent(role)}`),
 me:()=>api.get('/v1/users/me'),
 updateMe:(p:any)=>api.put('/v1/users/me',p),
 paymentProfile:(p:any)=>api.put('/v1/users/me/payment-profile',p),
 paymentDetails:()=>api.get('/v1/profile/payment-details'),
 savePaymentDetails:(p:any)=>api.put('/v1/profile/payment-details',p),
 adminAgents:()=>api.get('/v1/admin/agents'),
 createAgent:(p:any)=>api.post('/v1/admin/agents',p),
 getAgent:(id:string)=>api.get(`/v1/admin/agents/${id}`),
 updateAgent:(id:string,p:any)=>api.put(`/v1/admin/agents/${id}`,p),
 deleteAgent:(id:string)=>api.delete(`/v1/admin/agents/${id}`),
 deleteChit:(id:string)=>api.delete(`/v1/admin/chits/${id}`),
 removeMember:(chitId:string,participantId:string)=>api.delete(`/v1/admin/chits/${chitId}/participants/${participantId}`),
};

export const operationsApi={
 policy:()=>api.get('/v1/operations/policy'),
 summary:(id:string)=>api.get(`/v1/operations/chits/${id}/summary`),
};

export const chitsApi={
 list:()=>api.get('/v1/chits'),
 get:(id:string)=>api.get(`/v1/chits/${id}`),
 create:(p:any)=>api.post('/v1/chits',p),
 saveSchedule:(id:string,p:any)=>api.put(`/v1/chits/${id}/month-schedule`,p),
 publish:(id:string)=>api.post(`/v1/chits/${id}/publish`),
 start:(id:string)=>api.post(`/v1/chits/${id}/start`),
 rules:(id:string,p:any)=>api.put(`/v1/chit-rules/chits/${id}`,p),
 financial:(id:string)=>api.get(`/v1/chits/${id}/financial-summary`),
};

export const agentApi={
 dashboard:()=>api.get('/v1/agents/me/dashboard'),
 myChits:async()=>{
  const r:any=await api.get('/v1/agents/me/dashboard');
  const d=r.data?.data??r.data;
  return{...r,data:{data:d?.chits??[]}};
 },

 assign:(id:string,p:any)=>api.post(`/v1/chits/${id}/agents`,p),
 update:(id:string,agentId:string,p:any)=>api.put(`/v1/chits/${id}/agents/${agentId}`,p),
 chit:(id:string)=>api.get(`/v1/agents/me/chits/${id}`),
};

export const participantsApi={
 list:(id:string)=>api.get(`/v1/chits/${id}/participants`),
 invite:(id:string,p:any)=>api.post(`/v1/chits/${id}/participants/invite`,typeof p==='string'?{mobile:p}:p),
 invitations:()=>api.get('/v1/invitations/me'),
 accept:(id:string)=>api.post(`/v1/invitations/${id}/accept`),
};

export const auctionsApi={
 open:(c:string,p:any)=>api.post(`/v1/auctions/chits/${c}/open`,p),
 additionalOpen:(c:string,p:any)=>api.post(`/v1/auctions/chits/${c}/additional/open`,p),
 current:(c:string,m:string)=>api.get(`/v1/auctions/chits/${c}/months/${m}/current`),
 state:(id:string)=>api.get(`/v1/auctions/${id}/state`),
 bid:(id:string,p:any)=>api.post(`/v1/auctions/${id}/bids`,p),
 close:(id:string)=>api.post(`/v1/auctions/${id}/close`,{}),
 reopen:(id:string,p:any)=>api.post(`/v1/auctions/${id}/reopen`,p),
 finalize:(id:string)=>api.post(`/v1/auctions/${id}/finalize`,{}),
 savings:(c:string)=>api.get(`/v1/auctions/chits/${c}/savings`),
};

export const paymentsApi={obligations:(c:string,m:string)=>api.get(`/v1/payments/chits/${c}/months/${m}/obligations`),list:(c:string,m:string)=>api.get(`/v1/payments/chits/${c}/months/${m}`),submit:(c:string,p:string,payload:any)=>api.post(`/v1/payments/chits/${c}/participants/${p}/submit`,payload,{headers:{'Idempotency-Key':payload.idempotencyKey}}),verify:(id:string,p:any)=>api.post(`/v1/payments/${id}/verify`,p),verifyAll:(c:string,m:string,p:any)=>api.post(`/v1/payments/chits/${c}/months/${m}/verify-all`,p),recordCash:(o:string,p:any)=>api.post(`/v1/payment-collection/obligations/${o}/record-cash`,p),proof:(id:string,p:any)=>api.post(`/v1/payments/${id}/proof`,p),dispute:(id:string,p:any)=>api.post(`/v1/payments/${id}/dispute`,p)};

export const payoutsApi={list:(c:string)=>api.get(`/v1/payouts/chits/${c}`),settle:(id:string,p:any)=>api.post(`/v1/payouts/${id}/settle`,p)};
export const ledgerApi={me:(c:string,p:string)=>api.get(`/v1/ledger/chits/${c}/me/${p}`),all:(c:string)=>api.get(`/v1/ledger/chits/${c}`),adjust:(c:string,p:any)=>api.post(`/v1/ledger/chits/${c}/adjustments`,p)};
export const closeApi={month:(m:string)=>api.post(`/v1/month-close/months/${m}`)};
export const collectionsApi={overdue:(c:string)=>api.get(`/v1/collections/chits/${c}/overdue`)};
export const winnersApi={fixed:(c:string)=>api.get(`/v1/draws/chits/${c}/winners`),auction:(c:string)=>api.get(`/v1/auctions/chits/${c}/winners`)};
export const notificationsApi={list:(c:string)=>api.get(`/v1/chits/${c}/chat/notifications`),read:(c:string,id:string)=>api.post(`/v1/chits/${c}/chat/notifications/${id}/read`,{}),preferences:()=>api.get('/v1/notifications/preferences'),savePreferences:(p:any)=>api.put('/v1/notifications/preferences',p)};
export const reconciliationApi={summary:(c:string)=>api.get(`/v1/reconciliation/chits/${c}`),monthly:(c:string,m:string)=>api.get(`/v1/reconciliation/chits/${c}/months/${m}`),final:(c:string)=>api.get(`/v1/reconciliation/chits/${c}/final`)};

export const drawsApi={
 start:(c:string,p:any)=>api.post(`/v1/draws/chits/${c}/start`,p),
 get:(c:string,m:string)=>api.get(`/v1/draws/chits/${c}/months/${m}`),
 interest:(c:string,m:string,v:boolean)=>api.post(`/v1/draws/chits/${c}/months/${m}/interest`,{interested:v}),
 run:(c:string,m:string)=>api.post(`/v1/draws/chits/${c}/months/${m}/run`),
};
