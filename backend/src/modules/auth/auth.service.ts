import { Injectable, UnauthorizedException, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, FuncaoMinisterial, Sexo, EstadoCivil, Provincia, Departamento } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { CreateFirstAdminDto } from './dto/create-first-admin.dto';
import { v4 as uuidv4 } from 'uuid';

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
    // Validar entrada
    if (!emailOrUsername || !emailOrUsername.trim()) {
      throw new BadRequestException('Email ou username é obrigatório');
    }

    if (!password) {
      throw new BadRequestException('Password é obrigatória');
    }

    // Procurar usuário por email OU username
    const user = await this.usersRepository.findOne({ 
      where: [
        { email: emailOrUsername.trim() },
        { username: emailOrUsername.trim() }
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
    // 1. VALIDAR PERMISSÕES DE REGISTRO
    // Define hierarquia: quem pode registar quem
    const registrationHierarchy = {
      [UserRole.ADMIN]: [
        UserRole.ADMIN,
        UserRole.PASTOR_PRESIDENTE,
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.PASTOR_LOCAL,
        UserRole.LIDER_FINANCEIRO_LOCAL,
        UserRole.OBREIRO,
      ],
      [UserRole.PASTOR_PRESIDENTE]: [
        UserRole.PASTOR_LOCAL,
        UserRole.LIDER_FINANCEIRO_LOCAL,
        UserRole.OBREIRO,
      ],
      [UserRole.LIDER_FINANCEIRO_GERAL]: [
        UserRole.LIDER_FINANCEIRO_LOCAL,
        UserRole.OBREIRO,
      ],
      [UserRole.PASTOR_LOCAL]: [UserRole.OBREIRO],
      [UserRole.LIDER_FINANCEIRO_LOCAL]: [UserRole.OBREIRO],
      [UserRole.OBREIRO]: [], // OBREIRO não pode registar ninguém
    };

    // Verificar se usuário tem permissão para registar
    const userRoles = currentUser.roles || [];
    let canRegister = false;
    let allowedRolesToRegister: string[] = [];

    for (const role of userRoles) {
      if (registrationHierarchy[role]) {
        allowedRolesToRegister.push(...registrationHierarchy[role]);
        canRegister = true;
      }
    }

    if (!canRegister) {
      throw new ForbiddenException(
        'Você não tem permissão para registar novos usuários'
      );
    }

    // 2. VALIDAR ROLES DO NOVO USUÁRIO
    // O novo usuário só pode ter roles que o registador pode atribuir
    const newUserRoles = registerDto.roles || [UserRole.OBREIRO];
    const hasInvalidRole = newUserRoles.some(role => 
      !allowedRolesToRegister.includes(role)
    );

    if (hasInvalidRole) {
      throw new ForbiddenException(
        `Você não pode atribuir um ou mais papéis. Papéis permitidos: ${allowedRolesToRegister.join(', ')}`
      );
    }

    // 3. VALIDAR IGREJA
    // ADMINs podem registar em qualquer igreja
    // Outros devem registar na sua própria igreja
    if (!userRoles.includes(UserRole.ADMIN) && registerDto.churchId !== currentUser.churchId) {
      throw new ForbiddenException(
        'Você só pode registar usuários da sua própria igreja'
      );
    }

    // 4. VALIDAR EMAIL ÚNICO
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
      nomeCompleto: registerDto.nomeCompleto,
      apelido: registerDto.apelido,
      sexo: registerDto.sexo as Sexo,
      dataNascimento: registerDto.dataNascimento ? new Date(registerDto.dataNascimento) : undefined,
      estadoCivil: registerDto.estadoCivil as EstadoCivil,
      nacionalidade: registerDto.nacionalidade || 'Moçambicana',
      documentoIdentidade: registerDto.documentoIdentidade,
      
      // Contactos
      email: registerDto.email,
      telefone: registerDto.telefone,
      endereco: registerDto.endereco,
      cidade: registerDto.cidade,
      provincia: registerDto.provincia as Provincia,
      
      // Autenticação
      username: registerDto.username || registerDto.email.split('@')[0],
      passwordHash: hashedPassword,
      roles: registerDto.roles || [UserRole.VIEWER],
      ativo: registerDto.ativo !== false, // Permitir que o DTO controle se é ativo
      
      // Ministerial
      funcaoMinisterial: (registerDto.funcaoMinisterial as FuncaoMinisterial) || FuncaoMinisterial.MEMBRO,
      ministerio: registerDto.ministerio,
      dataConversao: registerDto.dataConversao ? new Date(registerDto.dataConversao) : undefined,
      dataBatismo: registerDto.dataBatismo ? new Date(registerDto.dataBatismo) : undefined,
      igrejaLocal: registerDto.igrejaLocal,
      liderDireto: registerDto.liderDireto || currentUser.sub, // Se não tem líder, o criador é o líder
      ativoNoMinisterio: registerDto.ativoNoMinisterio !== false,
      
      // Administrativo
      churchId: registerDto.churchId,
      departamento: registerDto.departamento as Departamento,
      
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

  /**
   * CRIAR PRIMEIRO ADMIN - createFirstAdmin()
   * 
   * Endpoint de setup inicial para produção (sem seeding automático)
   * 
   * Restrições de Segurança:
   * 1. Só funciona se NÃO existir nenhum usuário na BD
   * 2. Cria admin com role ADMIN
   * 3. Gera churchId próprio (admin é global)
   * 4. Requer dados completos (nome, email, username, password)
   * 
   * Uso:
   * POST /auth/setup/create-first-admin
   * {
   *   "nomeCompleto": "Administrador",
   *   "email": "admin@igreja.com",
   *   "username": "admin",
   *   "password": "SecurePass123!",
   *   "telefone": "+258 84 000 0000",
   *   "cidade": "Maputo"
   * }
   * 
   * Retorna:
   * {
   *   "success": true,
   *   "message": "Admin criado com sucesso",
   *   "user": { id, email, roles, churchId, ... }
   * }
   * 
   * Se já existir algum usuário, retorna erro 403 Forbidden
   */
  async createFirstAdmin(dto: CreateFirstAdminDto) {
    // 1. VALIDAR QUE NÃO EXISTEM USUÁRIOS
    const userCount = await this.usersRepository.count();
    if (userCount > 0) {
      throw new ForbiddenException(
        'Sistema já tem usuários. Use /auth/register para criar novos usuários.',
      );
    }

    // 2. VALIDAR EMAIL ÚNICO
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email já está registado');
    }

    // 3. VALIDAR USERNAME ÚNICO
    const existingUsername = await this.usersRepository.findOne({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username já está registado');
    }

    // 4. HASHEAR PASSWORD
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 5. CRIAR USUÁRIO ADMIN
    const admin = this.usersRepository.create({
      // Identificação
      nomeCompleto: dto.nomeCompleto,
      apelido: dto.nomeCompleto.split(' ').pop() || 'Admin',
      sexo: Sexo.MASCULINO,
      nacionalidade: 'Moçambicana',

      // Autenticação
      email: dto.email,
      username: dto.username,
      passwordHash,
      roles: [UserRole.ADMIN, UserRole.PASTOR_PRESIDENTE, UserRole.LIDER_FINANCEIRO_GERAL],
      ativo: true,

      // Contactos
      telefone: dto.telefone,
      cidade: dto.cidade,
      provincia: Provincia.MAPUTO_PROVINCIA,

      // Ministerial
      funcaoMinisterial: FuncaoMinisterial.PASTOR,
      igrejaLocal: 'Admin Global',
      ativoNoMinisterio: true,

      // Administrativo
      churchId: uuidv4(), // Admin tem sua própria churchId (global)
      departamento: Departamento.ADMINISTRACAO,
      nivelAprovacao: 999,
      assinaDocumentos: true,
      limiteFinanceiro: 999999999,

      // Auditoria
      observacoes: 'Admin criado manualmente no setup inicial. Altere a password no primeiro login!',
    });

    const savedAdmin = await this.usersRepository.save(admin);

    // 6. RETORNAR
    return {
      success: true,
      message: 'Admin criado com sucesso!',
      user: {
        id: savedAdmin.id,
        email: savedAdmin.email,
        username: savedAdmin.username,
        nomeCompleto: savedAdmin.nomeCompleto,
        roles: savedAdmin.roles,
        churchId: savedAdmin.churchId,
      },
    };
  }

  /**
   * LISTAR UTILIZADORES - Para seleção em formulários
   * 
   * Retorna lista simplificada de utilizadores
   * com id, name, email e roles
   */
  async listUsers() {
    const users = await this.usersRepository.find({
      select: ['id', 'nomeCompleto', 'email', 'roles'],
      where: { ativo: true },
      order: { nomeCompleto: 'ASC' },
    });

    // Mapear para formato esperado pelo frontend
    return users.map(user => ({
      id: user.id,
      name: user.nomeCompleto,
      email: user.email,
      roles: user.roles,
    }));
  }

  /**
   * LISTAR TODOS OS UTILIZADORES - Para página de gestão
   * 
   * Retorna lista completa com todos os utilizadores (activos e inactivos)
   * com informações detalhadas
   */
  async listAllUsers() {
    const users = await this.usersRepository.find({
      select: ['id', 'nomeCompleto', 'email', 'username', 'roles', 'ativo', 'churchId'],
      order: { nomeCompleto: 'ASC' },
    });

    return users.map(user => ({
      id: user.id,
      nomeCompleto: user.nomeCompleto,
      email: user.email,
      username: user.username,
      roles: user.roles,
      ativo: user.ativo,
      churchId: user.churchId,
    }));
  }

  /**
   * ACTUALIZAR UTILIZADOR - Desactivar/Activar
   */
  async updateUser(userId: string, updateData: { ativo?: boolean }) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    if (updateData.ativo !== undefined) {
      user.ativo = updateData.ativo;
    }

    const updated = await this.usersRepository.save(user);

    return {
      id: updated.id,
      nomeCompleto: updated.nomeCompleto,
      email: updated.email,
      ativo: updated.ativo,
      message: updateData.ativo ? 'Utilizador activado com sucesso' : 'Utilizador desactivado com sucesso',
    };
  }
}

