import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Sequelize } from 'sequelize-typescript';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/winner-reveal', cors: { origin: '*' } })
export class WinnerRevealGateway {
  @WebSocketServer() server!: Server;

  constructor(private readonly jwt: JwtService, private readonly db: Sequelize) {}

  private async authenticate(socket: Socket): Promise<string> {
    const token = String(socket.handshake.auth?.token || '').trim();
    if (!token) throw new UnauthorizedException('Authentication required');
    try {
      const payload: any = await this.jwt.verifyAsync(token);
      if (!payload?.sub) throw new Error('Missing subject');
      return String(payload.sub);
    } catch { throw new UnauthorizedException('Invalid websocket token'); }
  }

  private async canView(kind: 'DRAW'|'AUCTION', id: string, userId: string) {
    const table = kind === 'DRAW' ? 'draws' : 'auctions';
    const [rows]: any = await this.db.query(
      `SELECT 1 FROM ${table} x JOIN chits c ON c.id=x.chit_id
       WHERE x.id=:id AND (
         c.creator_id=:userId OR
         EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN') OR
         EXISTS(SELECT 1 FROM chit_participants cp WHERE cp.chit_id=c.id AND cp.user_id=:userId AND cp.status='ACTIVE') OR
         EXISTS(SELECT 1 FROM chit_agent_assignments ca JOIN agents ag ON ag.id=ca.agent_id
                 WHERE ca.chit_id=c.id AND ca.active=true AND ag.user_id=:userId AND ag.status='ACTIVE')
       ) LIMIT 1`,
      { replacements: { id, userId } },
    );
    return !!rows.length;
  }

  @SubscribeMessage('winner-reveal.join')
  async join(@MessageBody() payload: { kind: 'DRAW'|'AUCTION'; id: string }, @ConnectedSocket() socket: Socket) {
    if (!payload?.id || !['DRAW','AUCTION'].includes(payload.kind)) return { success:false, message:'Invalid reveal room' };
    try {
      const userId = await this.authenticate(socket);
      if (!(await this.canView(payload.kind, payload.id, userId))) return { success:false, message:'Access denied' };
      socket.data.userId = userId;
      socket.join(`${payload.kind.toLowerCase()}:${payload.id}`);
      return { success:true, kind:payload.kind, id:payload.id };
    } catch (e:any) {
      return { success:false, message:e?.message || 'Authentication failed' };
    }
  }

  @SubscribeMessage('winner-reveal.leave')
  leave(@MessageBody() payload: { kind: 'DRAW'|'AUCTION'; id: string }, @ConnectedSocket() socket: Socket) {
    socket.leave(`${String(payload.kind).toLowerCase()}:${payload.id}`);
    return { success:true };
  }

  emitStarted(kind: 'DRAW'|'AUCTION', id: string, data: any) {
    this.server.to(`${kind.toLowerCase()}:${id}`).emit('winner-reveal.started', { kind, id, ...data });
  }

  emitRevealed(kind: 'DRAW'|'AUCTION', id: string, data: any) {
    this.server.to(`${kind.toLowerCase()}:${id}`).emit('winner-reveal.revealed', { kind, id, ...data });
  }
}
