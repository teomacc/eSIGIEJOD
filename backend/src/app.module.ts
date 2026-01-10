import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthModule } from './modules/auth/auth.module';
import { FinancesModule } from './modules/finances/finances.module';
import { RequisitionsModule } from './modules/requisitions/requisitions.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';

/**
 * MÓDULO RAIZ DA APLICAÇÃO (AppModule)
 */
@Module({
  imports: [
    /**
     * Configuração global de variáveis de ambiente
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    /**
     * Configuração do PostgreSQL via TypeORM
     */
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST'),
        port: Number(config.get<number>('DATABASE_PORT')),
        username: config.get<string>('DATABASE_USER'),
        password: config.get<string>('DATABASE_PASSWORD'),
        database: config.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: true, // ⚠️ apenas em desenvolvimento
        logging: true,
      }),
    }),

    /**
     * Configuração global do JWT
     */
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('JWT_EXPIRATION') || 86400,
        },
      }),
      global: true,
    }),

    /**
     * Módulos de domínio (negócio)
     */
    AuthModule,
    FinancesModule,
    RequisitionsModule,
    ApprovalModule,
    AuditModule,
    ReportsModule,
  ],
})
export class AppModule {}
