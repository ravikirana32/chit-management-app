import {WebSocketGateway,SubscribeMessage,MessageBody,ConnectedSocket} from '@nestjs/websockets';
import {Injectable} from '@nestjs/common';
import {Socket} from 'socket.io';

@WebSocketGateway({namespace:'/chat',cors:{origin:true,credentials:true}})
@Injectable()
export class ChitChatGateway{
 @SubscribeMessage('chat.join')
 join(@MessageBody()body:{chitId:string},@ConnectedSocket()socket:Socket){
  if(body?.chitId)socket.join(`chit:${body.chitId}`);
  return {event:'chat.joined',chitId:body?.chitId};
 }
 @SubscribeMessage('chat.typing')
 typing(@MessageBody()body:{chitId:string;userId:string},@ConnectedSocket()socket:Socket){
  socket.to(`chit:${body.chitId}`).emit('chat.typing',{userId:body.userId});
 }
}
