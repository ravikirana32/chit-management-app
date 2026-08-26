import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class LedgerService {
  constructor(private readonly sequelize: Sequelize) {}

  async getParticipantLedger(chitId:string, participantId:string, userId:string) {
    const [ownership]:any=await this.sequelize.query(
      `SELECT cp.id,cp.user_id,cp.chit_id
       FROM chit_participants cp
       WHERE cp.id=:participantId AND cp.chit_id=:chitId`,
      {replacements:{participantId,chitId}});
    if(!ownership.length) throw new NotFoundException('Participant not found');
    if(ownership[0].user_id!==userId) throw new ConflictException('Participant does not belong to authenticated user');

    const [rows]:any=await this.sequelize.query(
      `SELECT * FROM ledger_entries
       WHERE chit_id=:chitId AND chit_participant_id=:participantId
       ORDER BY created_at ASC,id ASC`,
      {replacements:{chitId,participantId}});
    return this.withBalance(rows);
  }

  async getChitLedger(chitId:string, userId:string) {
    const [access]:any=await this.sequelize.query(
      `SELECT id FROM chits WHERE id=:chitId AND creator_id=:userId`,
      {replacements:{chitId,userId}});
    if(!access.length) throw new ConflictException('Only the chit creator can view the complete chit ledger');

    const [rows]:any=await this.sequelize.query(
      `SELECT * FROM ledger_entries WHERE chit_id=:chitId ORDER BY created_at ASC,id ASC`,
      {replacements:{chitId}});
    return this.withBalance(rows);
  }

  async recordAdjustment(chitId:string, actorUserId:string, dto:any) {
    return this.sequelize.transaction(async transaction=>{
      const [chit]:any=await this.sequelize.query(
        `SELECT id FROM chits WHERE id=:chitId AND creator_id=:actor`,
        {replacements:{chitId,actor:actorUserId},transaction});
      if(!chit.length) throw new ConflictException('Only creator can record ledger adjustments');

      const amount=Number(dto.amount);
      if(!Number.isFinite(amount)||amount===0) throw new BadRequestException('Adjustment amount cannot be zero');

      if(dto.participantId){
        const [p]:any=await this.sequelize.query(
          `SELECT id FROM chit_participants WHERE id=:participantId AND chit_id=:chitId`,
          {replacements:{participantId:dto.participantId,chitId},transaction});
        if(!p.length) throw new NotFoundException('Participant not found in chit');
      }

      const [rows]:any=await this.sequelize.query(
        `INSERT INTO ledger_entries
         (id,chit_id,chit_participant_id,entry_type,amount,description,reference_type,reference_id,
          created_by,created_at,updated_at)
         VALUES(gen_random_uuid(),:chitId,:participantId,:type,:amount,:description,
                'MANUAL_ADJUSTMENT',gen_random_uuid(),:actor,NOW(),NOW())
         RETURNING *`,
        {replacements:{
          chitId,participantId:dto.participantId??null,type:dto.entryType,
          amount,description:dto.description,actor:actorUserId
        },transaction});
      return rows[0];
    });
  }

  private withBalance(rows:any[]) {
    let balance=0;
    return rows.map(row=>{
      balance += Number(row.amount);
      return {...row,runningBalance:balance};
    });
  }
}
