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
 * 
 * Responsabilidade: Inicializar e configurar todos os módulos da aplicação
 * 
 * Fluxo de inicialização:
 * 1. ConfigModule - Carrega variáveis de ambiente (.env)
 * 2. TypeOrmModule - Configura conexão com PostgreSQL
 * 3. JwtModule - Configura JWT para autenticação
 * 4. Importa todos os módulos de negócio
 * 
 * Cada módulo é responsável por um domínio específico:
 * - Auth: Autenticação e controlo de acesso
 * - Finances: Gestão de entradas e fundos
 * - Requisitions: Fluxo de requisições de despesa
 * - Approval: Lógica automática de aprovação
 * - Audit: Registos imutáveis de auditoria
 * - Reports: Relatórios e análises
 */
@Module({
  imports: [
    // Carrega variáveis de ambiente
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configura banco de dados PostgreSQL com TypeORM
    // Utiliza variáveis do .env para conectar
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST'),
          port: parseInt(configService.get('DATABASE_PORT') || '5432'),
          username: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
          // Em desenvolvimento usa src, em produção usa dist compilado
          entities: isProduction 
            ? ['dist/**/*.entity.js']
            : ['src/**/*.entity.ts'],
          migrations: isProduction
            ? ['dist/migrations/**/*.js']
            : ['src/migrations/**/*.ts'],
          synchronize: !isProduction,
          logging: !isProduction,
        };
      },
    }),

    // Configura JWT para tokens de autenticação
    // Token contém: userId, email, roles, churchId
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get('JWT_SECRET');
        const expiresIn = configService.get('JWT_EXPIRATION') || '24h';
        
        return {
          secret: secret,
          signOptions: {
            expiresIn: expiresIn,
          },
        };
      },
      global: true, // Disponível em toda a aplicação
    }),

    // Módulos de negócio
    AuthModule, // Autenticação e RBAC
    FinancesModule, // Entradas e fundos
    RequisitionsModule, // Requisições de despesa
    ApprovalModule, // Lógica de aprovação
    AuditModule, // Logs imutáveis
    ReportsModule, // Relatórios
  ],
})
export class AppModule {}
