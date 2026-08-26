import {Body,Controller,Param,Post,Get,Module,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsIn,IsOptional,IsString} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class ResolveDto{
 @ApiProperty({enum:['WAIVED','ADJUSTED','MISSING_HISTORICAL_DATA','CORRECTED']})
 @IsIn(['WAIVED','ADJUSTED','MISSING_HISTORICAL_DATA','CORRECTED'])
 resolutionType!:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() note?:string;
}
@ApiTags('Chit Import Reconciliation') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chit-import',version:'v1'})
export class ChitImportReconciliationController{
 constructor(private readonly db:Sequelize){}
 @Post('batches/:batchId/reconcile') @ApiOperation({summary:'Build historical expected-vs-imported reconciliation'})
 async reconcile(@Param('batchId')batchId:string,@CurrentUser()u:any){
  const [b]:any=await this.db.query(`SELECT * FROM chit_import_batches WHERE id=:id AND imported_by=:u`,{replacements:{id:batchId,u:u.sub}});
  if(!b.length)return {success:false,message:'Import batch not found'};
  const [rows]:any=await this.db.query(`
   SELECT m.month_number,m.scheduled_amount,
    COALESCE(SUM(p.amount),0) imported_amount
   FROM chit_months m
   LEFT JOIN payments p ON p.chit_month_id=m.id AND p.import_batch_id=:b
   WHERE m.chit_id=:c AND m.month_number<:current
   GROUP BY m.id,m.month_number,m.scheduled_amount
   ORDER BY m.month_number`,{replacements:{b:batchId,c:b[0].chit_id,current:b[0].current_month_number}});
  for(const r of rows){
   await this.db.query(`
    INSERT INTO chit_import_reconciliation(import_batch_id,chit_id,month_number,expected_amount,imported_amount,difference_amount,status)
    VALUES(:b,:c,:m,:e,:i,:d,CASE WHEN :d=0 THEN 'MATCHED' ELSE 'UNRESOLVED' END)
    ON CONFLICT(import_batch_id,month_number) DO UPDATE SET expected_amount=:e,imported_amount=:i,difference_amount=:d,status=CASE WHEN :d=0 THEN 'MATCHED' ELSE 'UNRESOLVED' END`,
    {replacements:{b:batchId,c:b[0].chit_id,m:r.month_number,e:r.scheduled_amount??0,i:r.imported_amount??0,d:Number(r.scheduled_amount??0)-Number(r.imported_amount??0)}});
  }
  const [summary]:any=await this.db.query(`SELECT COUNT(*)::int months,COUNT(*) FILTER(WHERE status='MATCHED')::int matched,COUNT(*) FILTER(WHERE status='UNRESOLVED')::int unresolved,COALESCE(SUM(ABS(difference_amount)),0) total_difference FROM chit_import_reconciliation WHERE import_batch_id=:b`,{replacements:{b:batchId}});
  return {success:true,data:summary[0]};
 }
 @Get('batches/:batchId/reconciliation') async get(@Param('batchId')id:string,@CurrentUser()u:any){
  const [b]:any=await this.db.query(`SELECT id FROM chit_import_batches WHERE id=:id AND imported_by=:u`,{replacements:{id,u:u.sub}});
  if(!b.length)return {success:false,message:'Import batch not found'};
  const [r]:any=await this.db.query(`SELECT * FROM chit_import_reconciliation WHERE import_batch_id=:b ORDER BY month_number`,{replacements:{b:id}});
  return {success:true,data:r};
 }
 @Post('batches/:batchId/reconciliation/:reconciliationId/resolve') async resolve(@Param('batchId')b:string,@Param('reconciliationId')id:string,@Body()d:ResolveDto,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`
   UPDATE chit_import_reconciliation SET status='RESOLVED',resolution_type=:type,resolution_note=:note,resolved_by=:u,resolved_at=NOW()
   WHERE id=:id AND import_batch_id=:b RETURNING *`,{replacements:{id,b,type:d.resolutionType,note:d.note??null,u:u.sub}});
  return {success:!!r.length,data:r[0]??null};
 }
 @Post('batches/:batchId/apply') @ApiOperation({summary:'Apply only a reviewed and fully reconciled historical batch'})
 async apply(@Param('batchId')id:string,@CurrentUser()u:any){
  const [b]:any=await this.db.query(`SELECT * FROM chit_import_batches WHERE id=:id AND imported_by=:u`,{replacements:{id,u:u.sub}});
  if(!b.length)return {success:false,message:'Import batch not found'};
  const [un]:any=await this.db.query(`SELECT COUNT(*)::int n FROM chit_import_reconciliation WHERE import_batch_id=:id AND status='UNRESOLVED'`,{replacements:{id}});
  if(Number(un[0].n)>0)return {success:false,message:'Resolve all historical reconciliation differences before applying'};
  await this.db.query(`UPDATE chit_import_batches SET status='APPLIED',applied_at=NOW(),applied_by=:u WHERE id=:id`,{replacements:{id,u:u.sub}});
  return {success:true,message:'Historical batch applied; current-month activation requires final review'};
 }
 @Post('batches/:batchId/activate') @ApiOperation({summary:'Activate migrated chit after historical reconciliation'})
 async activate(@Param('batchId')id:string,@CurrentUser()u:any){
  const [b]:any=await this.db.query(`SELECT * FROM chit_import_batches WHERE id=:id AND imported_by=:u AND status='APPLIED'`,{replacements:{id,u:u.sub}});
  if(!b.length)return {success:false,message:'Batch must be APPLIED first'};
  const [c]:any=await this.db.query(`SELECT id FROM chits WHERE id=:c AND creator_id=:u`,{replacements:{c:b[0].chit_id,u:u.sub}});
  if(!c.length)return {success:false,message:'Only chit creator can activate'};
  await this.db.query(`UPDATE chit_import_batches SET status='ACTIVATED',activated_at=NOW() WHERE id=:id`,{replacements:{id}});
  return {success:true,message:'Migrated chit activated'};
 }
}
@Module({controllers:[ChitImportReconciliationController]}) export class ChitImportReconciliationModule{}
