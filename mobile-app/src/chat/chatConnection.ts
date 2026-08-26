export type ChatConnectionState='DISCONNECTED'|'CONNECTING'|'CONNECTED';
export function chatRoom(chitId:string){return `chit:${chitId}`}
export function createClientMessageId(){return `m-${Date.now()}-${Math.random().toString(36).slice(2)}`}
