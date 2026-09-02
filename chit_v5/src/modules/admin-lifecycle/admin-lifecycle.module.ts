import {
  Controller, Delete, ForbiddenException, Get, Injectable, Module, Param, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DatabaseModule } from '../../database/database.module';

@Injectable()
class AdminLifecycleGuard {
  constructor(private readonly db: Sequelize) {}
  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    if (!userId) throw new ForbiddenException('Authenticated user is required');
    const [rows]: any = await this.db.query(
      `SELECT 1 FROM user_roles WHERE user_id=:user AND role='ADMIN' LIMIT 1`,
      { replacements: { user: userId } },
    );
    if (!rows.length) throw new ForbiddenException('ADMIN role is required');
    return true;
  }
}

@ApiTags('Admin - Lifecycle')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminLifecycleGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminLifecycleController {
  constructor(private readonly db: Sequelize) {}

  @Delete('agents/:id')
  @ApiOperation({ summary: 'Deactivate an agent and its active chit assignments' })
  async deleteAgent(@Param('id') id: string) {
    return this.db.transaction(async transaction => {
      const [agentRows]: any = await this.db.query(
        `SELECT id,user_id,name,status FROM agents WHERE id=:id FOR UPDATE`,
        { replacements: { id }, transaction },
      );
      if (!agentRows.length) return { success: false, data: null };
      await this.db.query(
        `UPDATE chit_agent_assignments SET active=false WHERE agent_id=:id`,
        { replacements: { id }, transaction },
      );
      await this.db.query(
        `UPDATE agents SET status='INACTIVE',updated_at=NOW() WHERE id=:id`,
        { replacements: { id }, transaction },
      );
      if (agentRows[0].user_id) {
        await this.db.query(
          `DELETE FROM user_roles WHERE user_id=:user AND role='AGENT'`,
          { replacements: { user: agentRows[0].user_id }, transaction },
        );
      }
      return { success: true, data: { ...agentRows[0], status: 'INACTIVE' } };
    });
  }

  @Delete('chits/:id')
  @ApiOperation({ summary: 'Soft-delete an unstarted draft chit' })
  async deleteChit(@Param('id') id: string) {
    return this.db.transaction(async transaction => {
      const [rows]: any = await this.db.query(
        `SELECT * FROM chits WHERE id=:id FOR UPDATE`,
        { replacements: { id }, transaction },
      );
      if (!rows.length) return { success: false, data: null };
      const chit = rows[0];
      if (String(chit.status).toUpperCase() !== 'DRAFT') {
        throw new ForbiddenException('Only an unstarted DRAFT chit can be deleted');
      }
      await this.db.query(
        `UPDATE chits SET status='DELETED',updated_at=NOW() WHERE id=:id`,
        { replacements: { id }, transaction },
      );
      return { success: true, data: { id, status: 'DELETED' } };
    });
  }

  @Delete('chits/:chitId/participants/:participantId')
  @ApiOperation({ summary: 'Exit a member from a chit without deleting financial history' })
  async removeMember(
    @Param('chitId') chitId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.db.transaction(async transaction => {
      const [rows]: any = await this.db.query(
        `SELECT cp.*,c.status AS chit_status
         FROM chit_participants cp JOIN chits c ON c.id=cp.chit_id
         WHERE cp.id=:participantId AND cp.chit_id=:chitId
         FOR UPDATE`,
        { replacements: { chitId, participantId }, transaction },
      );
      if (!rows.length) return { success: false, data: null };
      const p = rows[0];
      if (['ACTIVE'].includes(String(p.chit_status).toUpperCase())) {
        throw new ForbiddenException('An active chit member cannot be removed after the chit has started');
      }
      await this.db.query(
        `UPDATE chit_participants
         SET status='EXITED',updated_at=NOW()
         WHERE id=:participantId AND chit_id=:chitId`,
        { replacements: { participantId, chitId }, transaction },
      );
      return { success: true, data: { ...p, status: 'EXITED' } };
    });
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [AdminLifecycleController],
  providers: [AdminLifecycleGuard],
})
export class AdminLifecycleModule {}
