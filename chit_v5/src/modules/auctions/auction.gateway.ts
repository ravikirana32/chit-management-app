import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Sequelize } from 'sequelize-typescript';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/auctions', cors: { origin: '*' } })
export class AuctionGateway {
  @WebSocketServer() server!: Server;
  constructor(private readonly jwt: JwtService, private readonly db: Sequelize) {}

  private async authenticate(socket: Socket): Promise<string> {
    const token=String(socket.handshake.auth?.token||'').trim();
    if(!token)throw new UnauthorizedException('Authentication required');
    try { const p:any=await this.jwt.verifyAsync(token); if(!p?.sub)throw new Error('Missing subject'); return String(p.sub); }
    catch { throw new UnauthorizedException('Invalid websocket token'); }
  }

  private async canView(auctionId:string,userId:string){
    const [rows]:any=await this.db.query(`SELECT 1 FROM auctions a JOIN chits c ON c.id=a.chit_id WHERE a.id=:auctionId AND (c.creator_id=:userId OR EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN') OR EXISTS(SELECT 1 FROM chit_participants cp WHERE cp.chit_id=c.id AND cp.user_id=:userId AND cp.status='ACTIVE') OR EXISTS(SELECT 1 FROM chit_agent_assignments ca JOIN agents ag ON ag.id=ca.agent_id WHERE ca.chit_id=c.id AND ca.active=true AND ag.user_id=:userId AND ag.status='ACTIVE')) LIMIT 1`,{replacements:{auctionId,userId}});return!!rows.length;
  }

  @SubscribeMessage('auction.join')
  async join(@MessageBody() payload:{auctionId:string},@ConnectedSocket() socket:Socket){
    try{const userId=await this.authenticate(socket);if(!(await this.canView(payload?.auctionId,userId)))return{success:false,message:'Access denied'};socket.data.userId=userId;socket.join(`auction:${payload.auctionId}`);socket.join(`user:${userId}`);socket.emit('auction.joined',{auctionId:payload.auctionId});return{success:true,auctionId:payload.auctionId};}catch(e:any){return{success:false,message:e?.message||'Authentication failed'};}
  }
  @SubscribeMessage('auction.leave')
  leave(@MessageBody() payload:{auctionId:string},@ConnectedSocket() socket:Socket){socket.leave(`auction:${payload.auctionId}`);return{success:true,auctionId:payload.auctionId};}
  emitBid(auctionId:string,data:any){this.server.to(`auction:${auctionId}`).emit('auction.bid',data);}
  emitState(auctionId:string,data:any){this.server.to(`auction:${auctionId}`).emit('auction.state',data);}
  emitNotification(userId:string,data:any){this.server.to(`user:${userId}`).emit('notification',data);}
  emitClosed(auctionId:string,data:any){this.server.to(`auction:${auctionId}`).emit('auction.closed',data);}
}
