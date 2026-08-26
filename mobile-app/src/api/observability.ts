export function createRequestId(prefix='mobile'){
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}
export function sanitizeError(error:any){
  return {
    status:error?.response?.status,
    code:error?.code,
    message:error?.response?.data?.message ?? error?.message ?? 'Unknown error'
  };
}
