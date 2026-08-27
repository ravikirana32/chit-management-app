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
        const databaseUrl = config.get<string>('DATABASE_URL')?.trim();

        const common = {
          dialect: 'postgres' as const,
          models: sequelizeModels,
          autoLoadModels: false,
          synchronize: false,
          logging: false,
          dialectOptions: { connectTimeout: 10000 },
        };

        if (databaseUrl) {
          let parsed: URL;
          try {
            parsed = new URL(databaseUrl);
          } catch {
            throw new Error('DATABASE_URL is present but is not a valid PostgreSQL URL');
          }

          const host = parsed.hostname;
          const port = Number(parsed.port || '5432');
          const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
          const username = decodeURIComponent(parsed.username);
          const password = decodeURIComponent(parsed.password);

          if (!host || !database || !username) {
            throw new Error('DATABASE_URL is missing required PostgreSQL connection fields');
          }

          const isRenderInternalHost =
            host.startsWith('dpg-') && !host.includes('.');

          console.log('[DATABASE] PostgreSQL configuration loaded', {
            source: 'DATABASE_URL',
            host,
            port,
            database,
            ssl: !isRenderInternalHost,
          });

          return {
            ...common,
            host,
            port,
            database,
            username,
            password,
            dialectOptions: {
              connectTimeout: 10000,
              ...(isRenderInternalHost
                ? {}
                : { ssl: { require: true, rejectUnauthorized: false } }),
            },
          };
        }

        const host = config.get<string>('DATABASE_HOST', 'localhost');
        const port = Number(config.get<string>('DATABASE_PORT', '5432'));
        const database = config.get<string>('DATABASE_NAME', 'chit_app');
        const username = config.get<string>('DATABASE_USER', 'postgres');
        const password = config.get<string>('DATABASE_PASSWORD', 'postgres');

        console.log('[DATABASE] PostgreSQL configuration loaded', {
          source: 'individual variables',
          host,
          port,
          database,
          ssl: false,
        });

        return { ...common, host, port, database, username, password };
      },
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
