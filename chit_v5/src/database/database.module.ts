import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from './models/User';
import { Chit } from './models/Chit';
import { ChitParticipant } from './models/ChitParticipant';
import { Agent } from './models/Agent';
import { ChitMonth } from './models/ChitMonth';
import { ContributionObligation } from './models/ContributionObligation';
import { Payment } from './models/Payment';

const sequelizeModels = [
  User,
  Chit,
  ChitParticipant,
  Agent,
  ChitMonth,
  ContributionObligation,
  Payment,
];

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');

        return {
          dialect: 'postgres',

          // Prefer Render's DATABASE_URL when available.
          // Keep the individual variables as a local/development fallback.
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: config.get<string>('DATABASE_HOST', 'localhost'),
                port: Number(config.get<string>('DATABASE_PORT', '5432')),
                database: config.get<string>('DATABASE_NAME', 'chit_app'),
                username: config.get<string>('DATABASE_USER', 'postgres'),
                password: config.get<string>(
                  'DATABASE_PASSWORD',
                  'postgres',
                ),
              }),

          models: sequelizeModels,
          autoLoadModels: false,
          synchronize: false,
          logging: false,
        };
      },
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
