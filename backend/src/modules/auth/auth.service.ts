import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';

/**
 * SERVIÇO DE AUTENTICAÇÃO (AuthService)
 * 
 * Responsabilidade: Gerir lógica de autenticação
 * 
 * Métodos principais:
 * 1. login() - Autentica usuário e gera JWT
 * 2. validateUser() - Valida email + password
 * 3. generateToken() - Cria JWT com informações do usuário
 * 
 * Fluxo de Login:
 * 1. POST /auth/login { email, password }
 * 2. validateUser() verifica credenciais
 * 3. Se válido, gera JWT token
 * 4. Token contém: userId, email, roles, churchId
 * 5. Cliente armazena token no localStorage
 * 6. Em requisições futuras, token é enviado no header Authorization
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * LOGIN - Autentica usuário e retorna JWT token
   * 
   * Parâmetros:
   * - email: Email do usuário
   * - password: Password em texto plano (nunca guardar assim!)
   * 
   * Fluxo:
   * 1. Procurar usuário por email no BD
   * 2. Comparar password (TODO: usar bcrypt)
   * 3. Se inválido, lançar erro 401
   * 4. Se válido, gerar JWT token
   * 5. Retornar token + dados do usuário
   * 
   * TODO: Implementar hashing com bcrypt:
   * const isPasswordValid = await bcrypt.compare(password, user.password);
   */
  async login(email: string, password: string) {
    // Procurar usuário por email
    const user = await this.usersRepository.findOne({ 
      where: { email } 
    });

    // Se usuário não existe
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // TODO: Comparar password hasheada
    // Por enquanto, comparação simples (NÃO usar em produção!)
    if (user.password !== password) {
      throw new UnauthorizedException('Password incorrecta');
    }

    // Se usuário está inativo, rejeitar
    if (!user.isActive) {
      throw new UnauthorizedException('Usuário desativado');
    }

    // Gerar JWT token
    const payload = {
      sub: user.id, // subject (standard JWT)
      email: user.email,
      roles: user.roles,
      churchId: user.churchId,
    };

    const access_token = this.jwtService.sign(payload);

    // Retornar token + dados do usuário
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        churchId: user.churchId,
      },
    };
  }

  /**
   * VALIDAR USUÁRIO - Valida email + password
   * 
   * Utilizado pela LocalStrategy do Passport
   * 
   * Parâmetros:
   * - email: Email do usuário
   * - password: Password em texto plano
   * 
   * Retorna:
   * - User se válido
   * - null se inválido
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    // Procurar usuário
    const user = await this.usersRepository.findOne({ 
      where: { email } 
    });

    // Se não existe
    if (!user) {
      return null;
    }

    // TODO: Usar bcrypt.compare() em vez de comparação simples
    if (user.password !== password) {
      return null;
    }

    // Se inativo, rejeitar
    if (!user.isActive) {
      return null;
    }

    // Retornar usuário se tudo válido
    return user;
  }

  /**
   * GERAR TOKEN JWT
   * 
   * Método auxiliar para gerar tokens
   * Pode ser reutilizado em outros cenários
   */
  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      churchId: user.churchId,
    };
    return this.jwtService.sign(payload);
  }
}
