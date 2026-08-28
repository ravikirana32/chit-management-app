import { Body, Controller, Global, Module, Post } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DatabaseModule } from '../../database/database.module';

class RequestOtpDto {
  @ApiProperty({ example: '+919999999999' })
  @IsString()
  @Length(10, 16)
  mobile!: string;
}

class VerifyOtpDto {
  @ApiProperty({ example: '+919999999999' })
  @IsString()
  @Length(10, 16)
  mobile!: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 8)
  otp!: string;
}

function normalizeMobile(value: string): string {
  return value.trim().replace(/[\s()-]/g, '');
}

@ApiTags('Authentication')
@Controller({ path: 'auth', version: 'v1' })
class AuthController {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: Sequelize,
    private readonly config: ConfigService,
  ) {}

  @Post('request-otp')
  requestOtp(@Body() d: RequestOtpDto) {
    return {
      success: true,
      data: {
        message: 'OTP request accepted',
        mobile: normalizeMobile(d.mobile),
      },
    };
  }

  @Post('verify-otp')
  async verify(@Body() d: VerifyOtpDto) {
    const mobile = normalizeMobile(d.mobile);
    const bootstrapAdminMobile = normalizeMobile(
      this.config.get<string>('BOOTSTRAP_ADMIN_MOBILE', ''),
    );

    const [existingRows]: any = await this.db.query(
      `SELECT id,name,mobile_number AS mobile,status
       FROM users
       WHERE normalized_mobile=:mobile
       LIMIT 1`,
      { replacements: { mobile } },
    );

    let userId: string;
    let name: string;

    if (existingRows.length) {
      const existing = existingRows[0];
      if (String(existing.status).toUpperCase() === 'DELETED') {
        throw new Error('User account is deleted');
      }
      userId = existing.id;
      name = existing.name;
    } else {
      const isBootstrapAdmin =
        !!bootstrapAdminMobile && mobile === bootstrapAdminMobile;

      const [createdRows]: any = await this.db.query(
        `INSERT INTO users(
           id,mobile_number,normalized_mobile,name,status,preferred_language,
           timezone,last_login_at,created_at,updated_at
         )
         VALUES(
           gen_random_uuid(),:mobile,:mobile,:name,'ACTIVE','en',
           'Asia/Kolkata',NOW(),NOW(),NOW()
         )
         RETURNING id,name`,
        {
          replacements: {
            mobile,
            name: isBootstrapAdmin ? 'System Administrator' : `User ${mobile}`,
          },
        },
      );

      userId = createdRows[0].id;
      name = createdRows[0].name;
    }

    await this.db.query(
      `UPDATE users SET last_login_at=NOW(),updated_at=NOW() WHERE id=:id`,
      { replacements: { id: userId } },
    );

    const [roleRows]: any = await this.db.query(
      `SELECT role FROM user_roles WHERE user_id=:id ORDER BY role`,
      { replacements: { id: userId } },
    );

    let roles = roleRows.map((r: any) => r.role);

    if (!roles.length) {
      const bootstrapAdmin =
        !!bootstrapAdminMobile && mobile === bootstrapAdminMobile;
      const defaultRole = bootstrapAdmin ? 'ADMIN' : 'MEMBER';

      await this.db.query(
        `INSERT INTO user_roles(id,user_id,role,created_at,updated_at)
         VALUES(gen_random_uuid(),:user,:role,NOW(),NOW())
         ON CONFLICT(user_id,role) DO NOTHING`,
        { replacements: { user: userId, role: defaultRole } },
      );

      roles = [defaultRole];
    }

    const accessToken = this.jwt.sign({
      sub: userId,
      mobile,
      roles,
    });

    return {
      success: true,
      data: {
        accessToken,
        user: { id: userId, name, mobile, roles },
      },
    };
  }
}

@Global()
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get('JWT_ACCESS_SECRET', 'development-only-secret'),
        signOptions: {
          expiresIn: c.get('JWT_ACCESS_EXPIRES', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
