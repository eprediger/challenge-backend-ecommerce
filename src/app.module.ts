import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { CatalogoModule } from './catalogo/catalogo.module';
import { dataSourceOptions } from './data-source';
import { loadEnv, type Env } from './env';
import { StockModule } from './stock/stock.module';

@Module({
  imports: [
    // The Zod schema is the single declaration of what env vars exist;
    // ConfigModule.validate runs it once at bootstrap (fail fast) and
    // ConfigService<Env, true> hands out typed values to consumers.
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw: Record<string, unknown>): Env => loadEnv(raw),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TypeOrmModuleOptions => ({
        // synchronize stays on: migrations are database-specific in any ORM,
        // and this challenge keeps both databases. One database + migrations
        // is the production choice; here dev speed wins.
        ...dataSourceOptions(config.get('database', { infer: true })),
        synchronize: true,
      }),
    }),
    CatalogoModule,
    StockModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
