import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class AuctionDistributionService {
  constructor(private readonly sequelize: Sequelize) {}

  async update(chitId:string,userId:string,mode:string){
    const allowed=['EQUAL_MEMBER_BENEFIT','REDUCE_CONTRIBUTION','CREATOR_REVENUE'];
    if(!allowed.includes(mode)) throw new BadRequestException('Invalid discount distribution mode');

    return this.sequelize.transaction(async transaction=>{
      const [rows]:any=await this.sequelize.query(
        `SELECT id,status FROM chits WHERE id=:chitId AND creator_id=:userId FOR UPDATE`,
        {replacements:{chitId,userId},transaction});
      if(!rows.length) throw new NotFoundException('Chit not found');
      if(['ACTIVE','COMPLETED'].includes(rows[0].status))
        throw new ConflictException('Auction distribution cannot change after activation');

      const [u]:any=await this.sequelize.query(
        `UPDATE chits SET auction_discount_distribution=:mode,updated_at=NOW()
         WHERE id=:chitId RETURNING id,auction_discount_distribution`,
        {replacements:{chitId,mode},transaction});
      return u[0];
    });
  }
}
