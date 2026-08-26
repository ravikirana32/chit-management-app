import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/auctions',
  cors: { origin: '*' },
})
export class AuctionGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('auction.join')
  join(
    @MessageBody() payload: { auctionId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const room = `auction:${payload.auctionId}`;
    socket.join(room);
    const userId = socket.handshake.auth?.userId as string | undefined;
    if (userId) socket.join(`user:${userId}`);
    socket.emit('auction.joined', { auctionId: payload.auctionId });
    return { success: true, auctionId: payload.auctionId };
  }

  @SubscribeMessage('auction.leave')
  leave(
    @MessageBody() payload: { auctionId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(`auction:${payload.auctionId}`);
    return { success: true, auctionId: payload.auctionId };
  }

  emitBid(auctionId: string, data: any) {
    this.server.to(`auction:${auctionId}`).emit('auction.bid', data);
  }

  emitState(auctionId: string, data: any) {
    this.server.to(`auction:${auctionId}`).emit('auction.state', data);
  }

  emitNotification(userId:string,data:any) {
    this.server.to(`user:${userId}`).emit('notification',data);
  }

  emitClosed(auctionId: string, data: any) {
    this.server.to(`auction:${auctionId}`).emit('auction.closed', data);
  }
}
