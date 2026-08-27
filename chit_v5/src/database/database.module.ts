import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as models from './models';
import { Model, ModelCtor } from 'sequelize-typescript';

const sequelizeModels = Object.values(models).filter(
  (model): model is ModelCtor<Model> =>
    typeof model === 'function' && model.prototype instanceof Model,
);

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: Number(config.get<string>('DATABASE_PORT', '5432')),
        database: config.get<string>('DATABASE_NAME', 'chit_app'),
        username: config.get<string>('DATABASE_USER', 'postgres'),
        password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
        models: sequelizeModels,
        autoLoadModels: false,
        synchronize: false,
        logging: false,
      }),
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
