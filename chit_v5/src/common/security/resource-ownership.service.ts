import {ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {Sequelize} from 'sequelize-typescript';

@Injectable()
export class ResourceOwnershipService{
 constructor(private readonly db:Sequelize){}
 async requireChitCreator(chitId:string,userId:string,transaction?:any){
  const [rows]:any=await this.db.query(
   `SELECT id,creator_id,status FROM chits WHERE id=:chitId ${transaction?'FOR UPDATE':''}`,
   {replacements:{chitId},transaction});
  if(!rows.length)throw new NotFoundException('Chit not found');
  if(rows[0].creator_id!==userId)throw new ConflictException('Only chit creator can perform this action');
  return rows[0];
 }
 async requireParticipant(chitId:string,participantId:string,userId:string){
  const [rows]:any=await this.db.query(
   `SELECT cp.* FROM chit_participants cp WHERE cp.id=:participantId AND cp.chit_id=:chitId AND cp.user_id=:userId`,
   {replacements:{chitId,participantId,userId}});
  if(!rows.length)throw new ConflictException('Participant does not belong to this user/chit');
  return rows[0];
 }
 async requireChitAccess(chitId:string,userId:string){
  const [rows]:any=await this.db.query(
   `SELECT c.* FROM chits c WHERE c.id=:chitId AND
    (c.creator_id=:userId OR EXISTS(SELECT 1 FROM chit_participants cp WHERE cp.chit_id=c.id AND cp.user_id=:userId AND cp.status IN ('ACTIVE','INVITED')))` ,
   {replacements:{chitId,userId}});
  if(!rows.length)throw new ConflictException('You do not have access to this chit');
  return rows[0];
 }
}
