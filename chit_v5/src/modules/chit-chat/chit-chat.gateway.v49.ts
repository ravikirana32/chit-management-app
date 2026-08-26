import {WebSocketGateway,SubscribeMessage,MessageBody,ConnectedSocket} from '@nestjs/websockets';
import {Socket} from 'socket.io';

@WebSocketGateway({namespace:'/chat',cors:{origin:true,credentials:true}})
export class ChitChatGatewayV49{
 @SubscribeMessage('chat.join')
 join(@MessageBody()b:{chitId:string},@ConnectedSocket()s:Socket){if(b?.chitId)s.join(`chit:${b.chitId}`);return {event:'chat.joined',chitId:b?.chitId}}
 @SubscribeMessage('chat.leave')
 leave(@MessageBody()b:{chitId:string},@ConnectedSocket()s:Socket){if(b?.chitId)s.leave(`chit:${b.chitId}`);return {event:'chat.left',chitId:b?.chitId}}
 @SubscribeMessage('chat.typing')
 typing(@MessageBody()b:{chitId:string;userId:string},@ConnectedSocket()s:Socket){s.to(`chit:${b.chitId}`).emit('chat.typing',{userId:b.userId})}
}
