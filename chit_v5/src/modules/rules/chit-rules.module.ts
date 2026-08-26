import { Body, Controller, Module, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { ChitRulesService } from './chit-rules.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class UpdateRulesDto {
  @ApiProperty({example:7,minimum:0,maximum:90}) @IsInt() @Min(0) @Max(90) graceDays!:number;
  @ApiProperty({example:'PER_AGENT_MONTH',enum:['FIXED','PER_AGENT_MONTH','NONE']})
  @IsString() commissionMode!:string;
}
@ApiTags('Chit Rules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'chit-rules',version:'v1'})
class ChitRulesController {
  constructor(private readonly service:ChitRulesService){}
  @Put('chits/:chitId')
  update(@Param('chitId') chitId:string,@Body() dto:UpdateRulesDto,@CurrentUser() user:any){
    return this.service.update(chitId,user.sub,dto.graceDays,dto.commissionMode);
  }
}
@Module({controllers:[ChitRulesController],providers:[ChitRulesService],exports:[ChitRulesService]})
export class ChitRulesModule {}
