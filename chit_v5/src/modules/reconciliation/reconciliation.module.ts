import {Controller,Get,Module,Param,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';
import {ReconciliationService} from './reconciliation.service';
@ApiTags('Reconciliation') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'reconciliation',version:'v1'})
class ReconciliationController{
 constructor(private readonly service:ReconciliationService){}
 @Get('chits/:chitId') summary(@Param('chitId')id:string,@CurrentUser()u:any){return this.service.chitSummary(id,u.sub)}
 @Get('chits/:chitId/months/:monthId') monthly(@Param('chitId')c:string,@Param('monthId')m:string,@CurrentUser()u:any){return this.service.monthly(c,m,u.sub)}
 @Get('chits/:chitId/members') members(@Param('chitId')id:string,@CurrentUser()u:any){return this.service.memberStatements(id,u.sub)}
 @Get('chits/:chitId/final') @ApiOperation({summary:'Final end-of-chit reconciliation'})
 final(@Param('chitId')id:string,@CurrentUser()u:any){return this.service.final(id,u.sub)}
}
@Module({controllers:[ReconciliationController],providers:[ReconciliationService],exports:[ReconciliationService]})
export class ReconciliationModule{}
