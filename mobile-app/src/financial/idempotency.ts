export function idempotencyKey(scope:string,entityId:string,attempt=1){
 return `${scope}:${entityId}:${attempt}:${Date.now()}`;
}
