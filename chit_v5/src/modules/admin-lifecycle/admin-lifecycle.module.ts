import { Body, Controller, Delete, Module, Param, UseGuards, ConflictException, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Lifecycle')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'admin', version: '1' })
class AdminLifecycleController {
  constructor(private readonly db: Sequelize) {}

  private async isAdmin(userId: string, transaction?: any) {
    const [rows]: any = await this.db.query(`SELECT 1 FROM user_roles WHERE user_id=:userId AND role='ADMIN' LIMIT 1`, { replacements:{userId}, transaction });
    return !!rows.length;
  }

  private async canManageChit(chitId: string, userId: string, transaction?: any) {
    if (await this.isAdmin(userId, transaction)) return true;
    const [rows]: any = await this.db.query(`
      SELECT 1 FROM chits c WHERE c.id=:chitId AND c.creator_id=:userId
      UNION ALL
      SELECT 1 FROM chit_agent_assignments ca JOIN agents ag ON ag.id=ca.agent_id
       WHERE ca.chit_id=:chitId AND ca.active=true AND ca.can_manage_chit=true
         AND ag.user_id=:userId AND ag.status='ACTIVE' LIMIT 1`,
      { replacements:{chitId,userId}, transaction });
    return !!rows.length;
  }

  @Delete('agents/:id')
  @ApiOperation({ summary: 'Deactivate an agent while retaining historical records' })
  async deleteAgent(@Param('id') id: string, @CurrentUser() user: any) {
    if (!(await this.isAdmin(user.sub))) throw new ConflictException('ADMIN role is required');
    return this.db.transaction(async transaction => {
      const [rows]: any = await this.db.query(`SELECT * FROM agents WHERE id=:id FOR UPDATE`, { replacements:{id}, transaction });
      if (!rows.length) throw new NotFoundException('Agent not found');
      const [updated]: any = await this.db.query(`UPDATE agents SET status='INACTIVE',updated_at=NOW() WHERE id=:id RETURNING *`, { replacements:{id}, transaction });
      await this.db.query(`UPDATE chit_agent_assignments SET active=false,updated_at=NOW() WHERE agent_id=:id`, { replacements:{id}, transaction });
      await this.db.query(`DELETE FROM user_roles WHERE user_id=:userId AND role='AGENT'`, { replacements:{userId:rows[0].user_id}, transaction });
      return { success:true, data:updated[0], message:'Agent deactivated; historical assignments and financial records retained.' };
    });
  }

  @Delete('chits/:id')
  @ApiOperation({ summary: 'Soft-delete an unstarted draft chit' })
  async deleteChit(@Param('id') id: string, @CurrentUser() user: any) {
    if (!(await this.isAdmin(user.sub))) throw new ConflictException('ADMIN role is required');
    return this.db.transaction(async transaction => {
      const [rows]: any = await this.db.query(`SELECT * FROM chits WHERE id=:id FOR UPDATE`, { replacements:{id}, transaction });
      if (!rows.length) throw new NotFoundException('Chit not found');
      if (rows[0].status !== 'DRAFT') throw new ConflictException('Only an unstarted DRAFT chit can be deleted');
      const [updated]: any = await this.db.query(`UPDATE chits SET status='DELETED',updated_at=NOW() WHERE id=:id RETURNING *`, { replacements:{id}, transaction });
      return { success:true, data:updated[0] };
    });
  }

  @Delete('chits/:chitId/participants/:participantId')
  @ApiOperation({ summary: 'Remove an active participant without deleting financial history' })
  async removeParticipant(@Param('chitId') chitId: string, @Param('participantId') participantId: string, @CurrentUser() user: any) {
    return this.db.transaction(async transaction => {
      if (!(await this.canManageChit(chitId, user.sub, transaction))) throw new ConflictException('Chit management permission is required');
      const [rows]: any = await this.db.query(`SELECT cp.*,c.status AS chit_status FROM chit_participants cp JOIN chits c ON c.id=cp.chit_id WHERE cp.id=:participantId AND cp.chit_id=:chitId FOR UPDATE`, { replacements:{participantId,chitId}, transaction });
      if (!rows.length) throw new NotFoundException('Participant not found');
      const p=rows[0];
      if (p.status !== 'ACTIVE') throw new ConflictException('Participant is not active');
      const [wins]: any = await this.db.query(`SELECT 1 FROM draw_winners dw JOIN draws d ON d.id=dw.draw_id WHERE dw.chit_participant_id=:participantId UNION ALL SELECT 1 FROM auction_winners aw JOIN auctions a ON a.id=aw.auction_id WHERE aw.chit_participant_id=:participantId LIMIT 1`, { replacements:{participantId}, transaction });
      if (wins.length) throw new ConflictException('A winning member cannot be removed; preserve the financial history');
      const [payments]: any = await this.db.query(`SELECT 1 FROM payments WHERE chit_id=:chitId AND participant_id=:participantId LIMIT 1`, { replacements:{chitId,participantId}, transaction }).catch(()=>[[]]);
      if (payments.length) throw new ConflictException('A member with payment history cannot be removed; preserve the financial history');
      const [updated]: any = await this.db.query(`UPDATE chit_participants SET status='EXITED',exited_at=NOW(),updated_at=NOW() WHERE id=:participantId RETURNING *`, { replacements:{participantId}, transaction });
      return { success:true, data:updated[0], message:'Participant exited; historical records retained.' };
    });
  }
}

@Module({ controllers:[AdminLifecycleController] })
export class AdminLifecycleModule {}
