import { Injectable, UnauthorizedException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, FuncaoMinisterial } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';

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
   * Aceita email OU username
   * Utiliza bcrypt para comparar password
   */
  async login(emailOrUsername: string, password: string) {
    // Procurar usuário por email OU username
    const user = await this.usersRepository.findOne({ 
      where: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    });

    // Se usuário não existe
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Comparar password com bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password incorrecta');
    }

    // Se usuário está inativo, rejeitar
    if (!user.ativo) {
      throw new UnauthorizedException('Usuário desativado');
    }

    // Atualizar último login
    await this.usersRepository.update(user.id, {
      ultimoLogin: new Date(),
    });

    // Gerar JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
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
        username: user.username,
        nomeCompleto: user.nomeCompleto,
        roles: user.roles,
        churchId: user.churchId,
        funcaoMinisterial: user.funcaoMinisterial,
      },
    };
  }

  /**
   * REGISTAR - Registar novo usuário
   * 
   * Restrições:
   * 1. Apenas DIRECTOR ou TREASURER podem registar novos usuários
   * 2. Só podem registar usuários da sua própria igreja
   * 3. Email deve ser único
   * 4. Password deve ser forte
   * 5. Password é hasheada com bcrypt (salt rounds: 10)
   * 
   * Parâmetros:
   * - registerDto: { email, password, name, churchId, roles }
   * - currentUser: Usuário autenticado que está a fazer o registo
   * 
   * Fluxo:
   * 1. Validar que currentUser é DIRECTOR ou TREASURER
   * 2. Validar que churchId coincide com a da currentUser
   * 3. Validar email único
   * 4. Validar password (mínimo 8 caracteres, 1 maiúscula, 1 número)
   * 5. Hashear password com bcrypt
   * 6. Criar novo usuário no BD
   * 7. Retornar dados do novo usuário (sem password)
   * 
   * Erros possíveis:
   * - 403 Forbidden: currentUser não é DIRECTOR/TREASURER
   * - 403 Forbidden: churchId diferente
   * - 409 Conflict: Email já existe
   * - 400 Bad Request: Password fraca ou dados inválidos
   */
  async register(
    registerDto: RegisterDto,
    currentUser: any,
  ): Promise<RegisterResponseDto> {
    // 1. VALIDAR PERMISSÕES
    // Apenas DIRECTOR e TREASURER podem registar novos usuários
    const allowedRoles = ['DIRECTOR', 'TREASURER'];
    const hasPermission = currentUser.roles.some(role => 
      allowedRoles.includes(role)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Apenas Directores e Tesoureiros podem registar novos usuários'
      );
    }

    // 2. VALIDAR IGREJA
    // Só pode registar usuários da sua própria igreja
    if (registerDto.churchId !== currentUser.churchId) {
      throw new ForbiddenException(
        'Só pode registar usuários da sua própria igreja'
      );
    }

    // 3. VALIDAR EMAIL ÚNICO
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está registado');
    }

    // 4. VALIDAR PASSWORD
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(registerDto.password)) {
      throw new BadRequestException(
        'Password deve ter mínimo 8 caracteres, 1 maiúscula e 1 número'
      );
    }

    // 5. HASHEAR PASSWORD
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      saltRounds
    );

    // 6. CRIAR NOVO USUÁRIO
    const newUser = this.usersRepository.create({
      // Identificação
      nomeCompleto: registerDto.name,
      email: registerDto.email,
      username: registerDto.email.split('@')[0], // Username = parte antes do @
      
      // Autenticação
      passwordHash: hashedPassword,
      roles: registerDto.roles || [UserRole.VIEWER],
      ativo: true,
      
      // Ministerial
      funcaoMinisterial: FuncaoMinisterial.MEMBRO,
      ativoNoMinisterio: true,
      
      // Administrativo
      churchId: registerDto.churchId,
      
      // Auditoria
      criadoPor: currentUser.sub,
    });

    const savedUser = await this.usersRepository.save(newUser);

    // 7. RETORNAR DADOS DO NOVO USUÁRIO
    return {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.nomeCompleto,
      churchId: savedUser.churchId,
      roles: savedUser.roles,
      message: 'Usuário registado com sucesso',
    };
  }

  /**
   * VALIDAR USUÁRIO - Valida email + password
   * 
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
  async validateUser(emailOrUsername: string, password: string): Promise<User | null> {
    // Procurar usuário por email OU username
    const user = await this.usersRepository.findOne({ 
      where: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    });

    // Se não existe
    if (!user) {
      return null;
    }

    // Comparar password com bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return null;
    }

    // Se inativo, rejeitar
    if (!user.ativo) {
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
