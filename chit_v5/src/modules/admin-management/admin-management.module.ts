import {
  Body, Controller, Delete, ForbiddenException, Get, Injectable,
  Module, Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  ArrayNotEmpty, IsArray, IsEmail, IsIn, IsOptional, IsString,
  Length, MaxLength,
} from 'class-validator';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';

const ALLOWED_ROLES = ['ADMIN', 'AGENT', 'MEMBER'] as const;
type UserRole = (typeof ALLOWED_ROLES)[number];

function normalizeMobile(value: string): string {
  return value.trim().replace(/[\s()-]/g, '');
}

@Injectable()
class AdminRoleGuard {
  constructor(private readonly db: Sequelize) {}

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    if (!userId) throw new ForbiddenException('Authenticated user is required');

    const [rows]: any = await this.db.query(
      `SELECT 1 FROM user_roles
       WHERE user_id=:user AND role='ADMIN' LIMIT 1`,
      { replacements: { user: userId } },
    );

    if (!rows.length) throw new ForbiddenException('ADMIN role is required');
    return true;
  }
}

class CreateUserDto {
  @ApiProperty({ example: 'Test Member 1' })
  @IsString() @MaxLength(150) name!: string;

  @ApiProperty({ example: '+919999999991' })
  @IsString() @Length(10, 20) mobile!: string;

  @ApiProperty({ required: false, example: 'member1@example.com' })
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;

  @ApiProperty({ required: false, enum: [...ALLOWED_ROLES], isArray: true, default: ['MEMBER'] })
  @IsOptional() @IsArray() @ArrayNotEmpty()
  @IsIn([...ALLOWED_ROLES], { each: true }) roles?: UserRole[];

  @ApiProperty({ required: false, example: 'Asia/Kolkata' })
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(30) status?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(10) preferredLanguage?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

class SetRolesDto {
  @ApiProperty({ enum: [...ALLOWED_ROLES], isArray: true, example: ['MEMBER'] })
  @IsArray() @ArrayNotEmpty()
  @IsIn([...ALLOWED_ROLES], { each: true }) roles!: UserRole[];
}

class AddRoleDto {
  @ApiProperty({ enum: [...ALLOWED_ROLES], example: 'MEMBER' })
  @IsIn([...ALLOWED_ROLES]) role!: UserRole;
}

class CreateAgentDto {
  @ApiProperty({ example: 'Agent One' })
  @IsString() @MaxLength(150) name!: string;
  @ApiProperty({ example: '+919999999992' })
  @IsString() @Length(10, 20) mobile!: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(255) upiId?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() userId?: string;
}

class UpdateAgentDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(20) mobile?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(255) upiId?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false })
  @IsOptional() @IsString() userId?: string;
}

@ApiTags('Admin - Users & Roles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller({ path: 'admin', version: 'v1' })
export class AdminManagementController {
  constructor(private readonly db: Sequelize) {}

  @Get('users')
  @ApiOperation({ summary: 'List users and roles' })
  async listUsers() {
    const [rows]: any = await this.db.query(`
      SELECT u.id,u.name,u.mobile_number AS mobile,u.email,u.status,
             u.preferred_language AS "preferredLanguage",u.timezone,
             u.created_at AS "createdAt",u.updated_at AS "updatedAt",
             COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL),
                      ARRAY[]::text[]) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id=u.id
      GROUP BY u.id ORDER BY u.created_at ASC
    `);
    return { success: true, data: rows };
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a user and assign roles' })
  async createUser(@Body() dto: CreateUserDto) {
    const mobile = normalizeMobile(dto.mobile);
    const [existing]: any = await this.db.query(
      `SELECT id FROM users WHERE normalized_mobile=:mobile LIMIT 1`,
      { replacements: { mobile } },
    );
    if (existing.length) {
      return { success: false, message: 'A user with this mobile number already exists',
        data: { id: existing[0].id } };
    }

    const [created]: any = await this.db.query(
      `INSERT INTO users(
         id,mobile_number,normalized_mobile,name,email,status,
         preferred_language,timezone,created_at,updated_at
       ) VALUES(
         gen_random_uuid(),:mobile,:mobile,:name,:email,'ACTIVE',
         'en',:timezone,NOW(),NOW()
       )
       RETURNING id,name,mobile_number AS mobile,email,status`,
      {
        replacements: {
          mobile, name: dto.name, email: dto.email ?? null,
          timezone: dto.timezone ?? 'Asia/Kolkata',
        },
      },
    );

    const userId = created[0].id;
    const roles = [...new Set(dto.roles ?? ['MEMBER'])];

    for (const role of roles) {
      await this.db.query(
        `INSERT INTO user_roles(id,user_id,role,created_at,updated_at)
         VALUES(gen_random_uuid(),:user,:role,NOW(),NOW())
         ON CONFLICT(user_id,role) DO NOTHING`,
        { replacements: { user: userId, role } },
      );
    }

    const [result]: any = await this.db.query(
      `SELECT u.id,u.name,u.mobile_number AS mobile,u.email,u.status,
              COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL),
                       ARRAY[]::text[]) AS roles
       FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id
       WHERE u.id=:id GROUP BY u.id`,
      { replacements: { id: userId } },
    );

    return { success: true, data: result[0] };
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const [rows]: any = await this.db.query(
      `SELECT u.id,u.name,u.mobile_number AS mobile,u.email,u.status,
              u.preferred_language AS "preferredLanguage",u.timezone,
              COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL),
                       ARRAY[]::text[]) AS roles
       FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id
       WHERE u.id=:id GROUP BY u.id`,
      { replacements: { id } },
    );
    return { success: true, data: rows[0] ?? null };
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const [rows]: any = await this.db.query(
      `UPDATE users
       SET name=COALESCE(:name,name), email=COALESCE(:email,email),
           status=COALESCE(:status,status),
           preferred_language=COALESCE(:language,preferred_language),
           timezone=COALESCE(:timezone,timezone), updated_at=NOW()
       WHERE id=:id
       RETURNING id,name,mobile_number AS mobile,email,status,
                 preferred_language AS "preferredLanguage",timezone`,
      {
        replacements: {
          id, name: dto.name ?? null, email: dto.email ?? null,
          status: dto.status ?? null, language: dto.preferredLanguage ?? null,
          timezone: dto.timezone ?? null,
        },
      },
    );
    return { success: !!rows.length, data: rows[0] ?? null };
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Soft-delete a user and remove all roles' })
  async deleteUser(@Param('id') id: string, @CurrentUser() currentUser: any) {
    if (id === currentUser.sub) {
      throw new ForbiddenException('You cannot delete your own ADMIN account');
    }

    await this.db.query(`UPDATE agents SET user_id=NULL WHERE user_id=:id`,
      { replacements: { id } });
    await this.db.query(`DELETE FROM user_roles WHERE user_id=:id`,
      { replacements: { id } });

    const [rows]: any = await this.db.query(
      `UPDATE users SET status='DELETED',updated_at=NOW()
       WHERE id=:id
       RETURNING id,name,mobile_number AS mobile,status`,
      { replacements: { id } },
    );
    return { success: !!rows.length, data: rows[0] ?? null };
  }

  @Get('users/:id/roles')
  async getRoles(@Param('id') id: string) {
    const [rows]: any = await this.db.query(
      `SELECT role,created_at AS "createdAt"
       FROM user_roles WHERE user_id=:id ORDER BY role`,
      { replacements: { id } },
    );
    return { success: true, data: rows };
  }

  @Post('users/:id/roles')
  async addRole(@Param('id') id: string, @Body() dto: AddRoleDto) {
    await this.ensureUserExists(id);
    const [rows]: any = await this.db.query(
      `INSERT INTO user_roles(id,user_id,role,created_at,updated_at)
       VALUES(gen_random_uuid(),:user,:role,NOW(),NOW())
       ON CONFLICT(user_id,role) DO NOTHING
       RETURNING id,user_id AS "userId",role`,
      { replacements: { user: id, role: dto.role } },
    );
    return { success: true, data: rows[0] ?? { userId: id, role: dto.role } };
  }

  @Put('users/:id/roles')
  @ApiOperation({ summary: 'Replace the complete role set for a user' })
  async setRoles(@Param('id') id: string, @Body() dto: SetRolesDto) {
    await this.ensureUserExists(id);
    const roles = [...new Set(dto.roles)];
    await this.db.query(`DELETE FROM user_roles WHERE user_id=:id`,
      { replacements: { id } });
    for (const role of roles) {
      await this.db.query(
        `INSERT INTO user_roles(id,user_id,role,created_at,updated_at)
         VALUES(gen_random_uuid(),:user,:role,NOW(),NOW())`,
        { replacements: { user: id, role } },
      );
    }
    return { success: true, data: { userId: id, roles } };
  }

  @Delete('users/:id/roles/:role')
  async removeRole(@Param('id') id: string, @Param('role') role: string) {
    const normalizedRole = role.toUpperCase();
    if (!(ALLOWED_ROLES as readonly string[]).includes(normalizedRole)) {
      throw new ForbiddenException('Unsupported role');
    }
    const [rows]: any = await this.db.query(
      `DELETE FROM user_roles WHERE user_id=:id AND role=:role
       RETURNING id,user_id AS "userId",role`,
      { replacements: { id, role: normalizedRole } },
    );
    return { success: !!rows.length, data: rows[0] ?? null };
  }

  @Get('agents')
  async listAgents() {
    const [rows]: any = await this.db.query(`
      SELECT a.id,a.user_id AS "userId",a.name,a.mobile,
             a.upi_id AS "upiId",a.status,a.notes,
             a.created_at AS "createdAt",u.email
      FROM agents a LEFT JOIN users u ON u.id=a.user_id
      ORDER BY a.created_at ASC
    `);
    return { success: true, data: rows };
  }

  @Post('agents')
  @ApiOperation({ summary: 'Create an agent profile and ensure AGENT role' })
  async createAgent(@Body() dto: CreateAgentDto) {
    let userId = dto.userId;

    if (!userId) {
      const mobile = normalizeMobile(dto.mobile);
      const [users]: any = await this.db.query(
        `SELECT id FROM users WHERE normalized_mobile=:mobile LIMIT 1`,
        { replacements: { mobile } },
      );
      if (!users.length) {
        throw new ForbiddenException(
          'Create the user first, then create the agent profile',
        );
      }
      userId = users[0].id;
    }

    await this.ensureUserExists(userId);

    await this.db.query(
      `INSERT INTO user_roles(id,user_id,role,created_at,updated_at)
       VALUES(gen_random_uuid(),:user,'AGENT',NOW(),NOW())
       ON CONFLICT(user_id,role) DO NOTHING`,
      { replacements: { user: userId } },
    );

    const [rows]: any = await this.db.query(
      `INSERT INTO agents(
         id,user_id,name,mobile,upi_id,status,notes,created_at,updated_at
       ) VALUES(
         gen_random_uuid(),:user,:name,:mobile,:upi,'ACTIVE',:notes,NOW(),NOW()
       )
       RETURNING id,user_id AS "userId",name,mobile,
                 upi_id AS "upiId",status,notes`,
      {
        replacements: {
          user: userId, name: dto.name, mobile: normalizeMobile(dto.mobile),
          upi: dto.upiId ?? null, notes: dto.notes ?? null,
        },
      },
    );
    return { success: true, data: rows[0] };
  }

  @Get('agents/:id')
  async getAgent(@Param('id') id: string) {
    const [rows]: any = await this.db.query(
      `SELECT id,user_id AS "userId",name,mobile,upi_id AS "upiId",
              status,notes,created_at AS "createdAt",updated_at AS "updatedAt"
       FROM agents WHERE id=:id`,
      { replacements: { id } },
    );
    return { success: true, data: rows[0] ?? null };
  }

  @Put('agents/:id')
  async updateAgent(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    if (dto.userId) await this.ensureUserExists(dto.userId);

    const [rows]: any = await this.db.query(
      `UPDATE agents
       SET name=COALESCE(:name,name),
           mobile=COALESCE(:mobile,mobile),
           upi_id=COALESCE(:upi,upi_id),
           notes=COALESCE(:notes,notes),
           status=COALESCE(:status,status),
           user_id=COALESCE(:user,user_id),
           updated_at=NOW()
       WHERE id=:id
       RETURNING id,user_id AS "userId",name,mobile,
                 upi_id AS "upiId",status,notes`,
      {
        replacements: {
          id, name: dto.name ?? null,
          mobile: dto.mobile ? normalizeMobile(dto.mobile) : null,
          upi: dto.upiId ?? null, notes: dto.notes ?? null,
          status: dto.status ?? null, user: dto.userId ?? null,
        },
      },
    );

    if (dto.userId) {
      await this.db.query(
        `INSERT INTO user_roles(id,user_id,role,created_at,updated_at)
         VALUES(gen_random_uuid(),:user,'AGENT',NOW(),NOW())
         ON CONFLICT(user_id,role) DO NOTHING`,
        { replacements: { user: dto.userId } },
      );
    }

    return { success: !!rows.length, data: rows[0] ?? null };
  }

  @Delete('agents/:id')
  async deleteAgent(@Param('id') id: string) {
    const [rows]: any = await this.db.query(
      `DELETE FROM agents WHERE id=:id
       RETURNING id,user_id AS "userId",name,status`,
      { replacements: { id } },
    );

    if (rows.length && rows[0].userId) {
      await this.db.query(
        `DELETE FROM user_roles
         WHERE user_id=:user AND role='AGENT'`,
        { replacements: { user: rows[0].userId } },
      );
    }

    return { success: !!rows.length, data: rows[0] ?? null };
  }

  private async ensureUserExists(id: string) {
    const [rows]: any = await this.db.query(
      `SELECT id FROM users WHERE id=:id AND status<>'DELETED' LIMIT 1`,
      { replacements: { id } },
    );
    if (!rows.length) throw new ForbiddenException('User not found or deleted');
  }
}

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AdminManagementController],
  providers: [AdminRoleGuard],
})
export class AdminManagementModule {}
