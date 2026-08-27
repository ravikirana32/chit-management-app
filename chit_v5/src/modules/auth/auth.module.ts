import { Body, Global, Controller, Module, Post } from '@nestjs/common';
import {ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsString,Length} from 'class-validator';
import {ConfigModule,ConfigService} from '@nestjs/config';
import {JwtModule,JwtService} from '@nestjs/jwt';
import {JwtAuthGuard} from './jwt-auth.guard';

class RequestOtpDto{
 @ApiProperty({example:'+919999999999'})@IsString()@Length(10,16)mobile!:string
}
class VerifyOtpDto{
 @ApiProperty()@IsString()@Length(10,16)mobile!:string;
 @ApiProperty()@IsString()@Length(4,8)otp!:string
}

@ApiTags('Authentication')
@Controller({path:'auth',version:'v1'})
class AuthController{
 constructor(private readonly jwt:JwtService){}
 @Post('request-otp')
 requestOtp(@Body()d:RequestOtpDto){
  return{success:true,data:{message:'OTP request accepted',mobile:d.mobile}}
 }
 @Post('verify-otp')
 verify(@Body()d:VerifyOtpDto){
  return{success:true,data:{accessToken:this.jwt.sign({sub:'00000000-0000-0000-0000-000000000001',mobile:d.mobile})}}
 }
}

@Global()
@Module({
  imports:[
    ConfigModule,
    JwtModule.registerAsync({
      imports:[ConfigModule],
      inject:[ConfigService],
      useFactory:(c:ConfigService)=>({
        secret:c.get('JWT_ACCESS_SECRET','development-only-secret'),
        signOptions:{expiresIn:c.get('JWT_ACCESS_EXPIRES','15m')}
      })
    })
  ],
  controllers:[AuthController],
  providers:[JwtAuthGuard],
  exports:[JwtAuthGuard,JwtModule]
})
export class AuthModule {}
