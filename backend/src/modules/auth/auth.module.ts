import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { User } from './entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { DatabaseSeeder } from './database.seeder';

/**
 * MÓDULO DE AUTENTICAÇÃO (AuthModule)
 * 
 * Responsabilidade: Gerir autenticação, autorização e controlo de acesso
 * 
 * Componentes:
 * - User Entity: Modelo de dados para usuários
 * - AuthService: Lógica de autenticação (login, validação)
 * - AuthController: Endpoints de autenticação
 * - JwtStrategy: Estratégia Passport para validar JWT
 * - LocalStrategy: Estratégia Passport para validar credenciais locais
 * 
 * Fluxo de Autenticação:
 * 1. Usuário envia email + password para POST /auth/login
 * 2. AuthService valida credenciais com LocalStrategy
 * 3. Se válido, JwtService gera token JWT
 * 4. Token contém: userId, email, roles, churchId
 * 5. Cliente armazena token no localStorage
 * 6. Em requisições posteriores, token é enviado no header Authorization
 * 7. JwtStrategy valida e extrai dados do token
 */
@Module({
  imports: [
    // Registar User entity para ser gerida pelo TypeORM
    TypeOrmModule.forFeature([User]),
    // Passport é o framework de autenticação utilizado
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // Valida JWT tokens
    LocalStrategy, // Valida email + password
    DatabaseSeeder, // Seed automático de admin padrão
  ],
  // Exportar AuthService para ser utilizado por outros módulos
  exports: [AuthService],
})
export class AuthModule {}
