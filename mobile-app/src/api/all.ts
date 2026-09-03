import{api}from'./client';

export const authApi={
 requestOtp:(mobile:string)=>api.post('/v1/auth/request-otp',{mobile}),
 verify:(mobile:string,otp:string)=>api.post('/v1/auth/verify-otp',{mobile,otp}),
 verifyOtp:(mobile:string,otp:string)=>api.post('/v1/auth/verify-otp',{mobile,otp}),
 refresh:(refreshToken:string)=>api.post('/v1/auth/refresh',{refreshToken}),
 logout:(refreshToken:string)=>api.post('/v1/auth/logout',{refreshToken}),
};
export const dashboardApi={me:()=>api.get('/v1/dashboard/me'),chit:(id:string)=>api.get(`/v1/dashboard/chits/${id}`),agent:()=>api.get('/v1/agents/me/dashboard')};
export const usersApi={
 adminUsers:()=>api.get('/v1/admin/users'),createUser:(p:any)=>api.post('/v1/admin/users',p),getUser:(id:string)=>api.get(`/v1/admin/users/${id}`),updateUser:(id:string,p:any)=>api.put(`/v1/admin/users/${id}`,p),deleteUser:(id:string)=>api.delete(`/v1/admin/users/${id}`),
 roles:(id:string)=>api.get(`/v1/admin/users/${id}/roles`),addRole:(id:string,role:string)=>api.post(`/v1/admin/users/${id}/roles`,{role}),setRoles:(id:string,roles:string[])=>api.put(`/v1/admin/users/${id}/roles`,{roles}),removeRole:(id:string,role:string)=>api.delete(`/v1/admin/users/${id}/roles/${encodeURIComponent(role)}`),
 adminAgents:()=>api.get('/v1/admin/agents'),createAgent:(p:any)=>api.post('/v1/admin/agents',p),getAgent:(id:string)=>api.get(`/v1/admin/agents/${id}`),updateAgent:(id:string,p:any)=>api.put(`/v1/admin/agents/${id}`,p),
 paymentDetails:()=>api.get('/v1/users/me/payment-profile'),savePaymentDetails:(p:any)=>api.put('/v1/users/me/payment-profile',p),
 deleteAgent:(id:string)=>api.delete(`/v1/admin/agents/${id}`),deleteChit:(id:string)=>api.delete(`/v1/admin/chits/${id}`),
};
export const operationsApi={policy:()=>api.get('/v1/operations/policy'),summary:(id:string)=>api.get(`/v1/operations/chits/${id}/summary`)};
export const chitsApi={list:()=>api.get('/v1/chits'),get:(id:string)=>api.get(`/v1/chits/${id}`),create:(p:any)=>api.post('/v1/chits',p),saveSchedule:(id:string,p:any)=>api.put(`/v1/chits/${id}/month-schedule`,p),publish:(id:string)=>api.post(`/v1/chits/${id}/publish`),start:(id:string)=>api.post(`/v1/chits/${id}/start`)};
export const agentApi={dashboard:()=>api.get('/v1/agents/me/dashboard'),myChits:async()=>{const r:any=await api.get('/v1/agents/me/dashboard');const d=r.data?.data??r.data;return{...r,data:{data:d?.chits??[]}}},chit:(id:string)=>api.get(`/v1/agents/me/chits/${id}`)};
export const participantsApi={list:(id:string)=>api.get(`/v1/chits/${id}/participants`),invitations:()=>api.get('/v1/invitations/me'),accept:(id:string)=>api.post(`/v1/invitations/${id}/accept`),invite:(id:string,p:{mobile:string})=>api.post(`/v1/chits/${id}/participants/invite`,p),remove:(chitId:string,participantId:string)=>api.delete(`/v1/chits/${chitId}/participants/${participantId}`)};
export const paymentsApi={
 obligations:(chitId:string,monthId:string)=>api.get(`/v1/payments/chits/${chitId}/months/${monthId}/obligations`),
 list:(chitId:string,monthId:string)=>api.get(`/v1/payments/chits/${chitId}/months/${monthId}`),
 submit:(chitId:string,participantId:string,p:any)=>api.post(`/v1/payments/chits/${chitId}/participants/${participantId}/submit`,p,{headers:{'Idempotency-Key':p.idempotencyKey}}),
 verify:(paymentId:string,p:any)=>api.post(`/v1/payments/${paymentId}/verify`,p),
 verifyAll:(chitId:string,monthId:string,p:any)=>api.post(`/v1/payments/chits/${chitId}/months/${monthId}/verify-all`,p),
};
export const payoutsApi={list:(chitId:string)=>api.get(`/v1/payouts/chits/${chitId}`),settle:(id:string,p:any)=>api.post(`/v1/payouts/${id}/settle`,p)};
export const closeApi={month:(monthId:string)=>api.post(`/v1/month-close/months/${monthId}`)};
export const auctionsApi={open:(c:string,p:any)=>api.post(`/v1/auctions/chits/${c}/open`,p),additionalOpen:(c:string,p:any)=>api.post(`/v1/auctions/chits/${c}/additional/open`,p),current:(c:string,m:string)=>api.get(`/v1/auctions/chits/${c}/months/${m}/current`),state:(id:string)=>api.get(`/v1/auctions/${id}/state`),bid:(id:string,p:any)=>api.post(`/v1/auctions/${id}/bids`,p),close:(id:string)=>api.post(`/v1/auctions/${id}/close`,{}),reopen:(id:string,p:any)=>api.post(`/v1/auctions/${id}/reopen`,p),finalize:(id:string)=>api.post(`/v1/auctions/${id}/finalize`,{auctionId:id}),savings:(c:string)=>api.get(`/v1/auctions/chits/${c}/savings`)};
export const drawsApi={start:(c:string,p:any)=>api.post(`/v1/draws/chits/${c}/start`,p),get:(c:string,m:string)=>api.get(`/v1/draws/chits/${c}/months/${m}`),interest:(c:string,m:string,v:boolean)=>api.post(`/v1/draws/chits/${c}/months/${m}/interest`,{interested:v}),run:(c:string,m:string)=>api.post(`/v1/draws/chits/${c}/months/${m}/run`),agentPayout:(c:string,m:string)=>api.post(`/v1/draws/chits/${c}/months/${m}/agent-payout`)};

export const ledgerApi={me:(chitId:string,participantId:string)=>api.get(`/v1/ledger/chits/${chitId}/me/${participantId}`),all:(chitId:string)=>api.get(`/v1/ledger/chits/${chitId}`)};
export const notificationsApi={me:()=>api.get('/v1/notifications/me'),list:(chitId:string)=>api.get(`/v1/notifications/chits/${chitId}`),read:(chitId:string,id:string)=>api.put(`/v1/notifications/${id}/read`,{chitId}),preferences:()=>api.get('/v1/notifications/preferences'),savePreferences:(p:any)=>api.put('/v1/notifications/preferences',p)};
export const collectionsApi={overdue:(chitId:string)=>api.get(`/v1/collections/chits/${chitId}/overdue`)};
export const reconciliationApi={summary:(chitId:string)=>api.get(`/v1/reconciliation/chits/${chitId}`),monthly:(chitId:string,monthId:string)=>api.get(`/v1/reconciliation/chits/${chitId}/months/${monthId}`),members:(chitId:string)=>api.get(`/v1/reconciliation/chits/${chitId}/members`),final:(chitId:string)=>api.get(`/v1/reconciliation/chits/${chitId}/final`)};
