import {
  Controller,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Invitations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'invitations', version: '1' })
class InvitationsController {
  constructor(private readonly db: Sequelize) {}

  @Get('me')
  @ApiOperation({
    summary: 'List invitations for the logged-in member',
  })
  async myInvitations(@CurrentUser() user: any) {
    const [rows]: any = await this.db.query(
      `SELECT
         cp.id,
         cp.chit_id,
         cp.user_id,
         cp.participation_role,
         cp.status,
         cp.joined_at,
         cp.accepted_at,
         cp.exited_at,
         cp.participant_sequence,
         cp.notes,
         cp.created_at,
         cp.updated_at,
         c.name AS chit_name,
         c.status AS chit_status,
         c.total_members,
         c.total_months,
         c.start_date,
         c.due_day,
         u.name AS member_name,
         u.mobile_number AS mobile
       FROM chit_participants cp
       JOIN chits c ON c.id = cp.chit_id
       JOIN users u ON u.id = cp.user_id
       WHERE cp.user_id = :user
       ORDER BY cp.created_at DESC`,
      { replacements: { user: user.sub } },
    );

    return { success: true, data: rows };
  }

  @Post(':id/accept')
  @ApiOperation({
    summary: 'Accept an invitation as the logged-in member',
  })
  async accept(
    @Param('id') participantId: string,
    @CurrentUser() user: any,
  ) {
    return this.db.transaction(async (transaction) => {
      const [rows]: any = await this.db.query(
        `SELECT
           cp.id,
           cp.chit_id,
           cp.user_id,
           cp.status,
           cp.participant_sequence,
           c.status AS chit_status,
           c.total_members
         FROM chit_participants cp
         JOIN chits c ON c.id = cp.chit_id
         WHERE cp.id = :participantId
           AND cp.user_id = :user
         FOR UPDATE`,
        {
          replacements: {
            participantId,
            user: user.sub,
          },
          transaction,
        },
      );

      if (!rows.length) {
        throw new NotFoundException('Invitation not found');
      }

      const invitation = rows[0];

      if (invitation.status === 'ACTIVE') {
        return {
          success: true,
          data: {
            message: 'Invitation already accepted',
            participantId: invitation.id,
            chitId: invitation.chit_id,
            status: 'ACTIVE',
          },
        };
      }

      if (invitation.status !== 'INVITED') {
        throw new ConflictException(
          `Invitation cannot be accepted in status ${invitation.status}`,
        );
      }

      if (
        invitation.chit_status !== 'DRAFT' &&
        invitation.chit_status !== 'INVITING' &&
        invitation.chit_status !== 'MEMBERS_CONFIRMED'
      ) {
        throw new ConflictException(
          'This chit is no longer accepting member invitations',
        );
      }

      const [countRows]: any = await this.db.query(
        `SELECT COUNT(*)::int AS n
         FROM chit_participants
         WHERE chit_id = :chitId
           AND status = 'ACTIVE'`,
        {
          replacements: { chitId: invitation.chit_id },
          transaction,
        },
      );

      if (countRows[0].n >= invitation.total_members) {
        throw new ConflictException('Chit member capacity reached');
      }

      const [updatedRows]: any = await this.db.query(
        `UPDATE chit_participants
         SET
           status = 'ACTIVE',
           accepted_at = COALESCE(accepted_at, NOW()),
           joined_at = COALESCE(joined_at, NOW()),
           updated_at = NOW()
         WHERE id = :participantId
           AND user_id = :user
           AND status = 'INVITED'
         RETURNING *`,
        {
          replacements: {
            participantId,
            user: user.sub,
          },
          transaction,
        },
      );

      if (!updatedRows.length) {
        throw new ConflictException(
          'Invitation was changed before it could be accepted',
        );
      }

      return {
        success: true,
        data: {
          message: 'Invitation accepted',
          participant: updatedRows[0],
        },
      };
    });
  }
}

@Module({
  controllers: [InvitationsController],
})
export class InvitationsModule {}
