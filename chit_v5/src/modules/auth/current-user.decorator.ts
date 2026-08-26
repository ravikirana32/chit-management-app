import {createParamDecorator,ExecutionContext} from '@nestjs/common'; export const CurrentUser=createParamDecorator((_d,ctx:ExecutionContext)=>ctx.switchToHttp().getRequest().user);
