import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, Sexo, FuncaoMinisterial, Departamento } from '../auth/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * SERVIÇO DE SEED (DatabaseSeeder)
 * 
 * Responsabilidade: Criar dados iniciais na base de dados
 * 
 * Funcionalidades:
 * 1. Verificar se BD está vazia
 * 2. Criar Admin padrão se não existir nenhum usuário
 * 3. Criar Igreja padrão
 * 
 * Executa automaticamente quando a aplicação inicia (OnModuleInit)
 * 
 * Admin Padrão:
 * - Username: admin
 * - Email: admin@esigiejod.com
 * - Password: Admin123! (deve ser alterado no primeiro login)
 * - Role: ADMIN
 * - ChurchId: church-seed-default-001
 */
@Injectable()
export class DatabaseSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Hook executado quando o módulo é inicializado
   */
  async onModuleInit() {
    await this.seedDatabase();
  }

  /**
   * SEED DATABASE
   * 
   * Fluxo:
   * 1. Verificar se existe algum usuário na BD
   * 2. Se não existir nenhum, criar Admin padrão
   * 3. Log de confirmação
   */
  async seedDatabase() {
    console.log('🌱 [SEED] Verificando base de dados...');

    // Contar usuários existentes
    const userCount = await this.usersRepository.count();

    if (userCount > 0) {
      console.log(`✅ [SEED] Base de dados já tem ${userCount} usuário(s). Seed não necessário.`);
      return;
    }

    console.log('📝 [SEED] Base de dados vazia. Criando Admin padrão...');

    try {
      await this.createDefaultAdmin();
      console.log('✅ [SEED] Admin padrão criado com sucesso!');
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔑 CREDENCIAIS DO ADMIN PADRÃO:');
      console.log('   Username: admin');
      console.log('   Email: admin@esigiejod.com');
      console.log('   Password: Admin123!');
      console.log('');
      console.log('⚠️  IMPORTANTE: Altere a password no primeiro login!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
    } catch (error) {
      console.error('❌ [SEED] Erro ao criar Admin padrão:', error);
    }
  }

  /**
   * CRIAR ADMIN PADRÃO
   * 
   * Cria usuário administrador inicial com:
   * - Acesso total ao sistema
   * - ChurchId UUID válido (gerado automaticamente)
   * - Password forte que deve ser alterada
   */
  async createDefaultAdmin() {
    // Gerar UUID válido para a igreja (em vez de string)
    const defaultChurchId = uuidv4();

    // Hashear password padrão
    const saltRounds = 10;
    const defaultPassword = 'Admin123!';
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Criar usuário admin
    const admin = this.usersRepository.create({
      // Identificação
      nomeCompleto: 'Administrador do Sistema',
      apelido: 'Admin',
      sexo: Sexo.MASCULINO,
      nacionalidade: 'Moçambicana',
      
      // Ministerial
      funcaoMinisterial: FuncaoMinisterial.PASTOR,
      ativoNoMinisterio: true,
      igrejaLocal: 'Igreja Sede',
      
      // Contactos
      email: 'admin@esigiejod.com',
      telefone: '+258 84 000 0000',
      cidade: 'Maputo',
      provincia: 'Maputo',
      
      // Acesso
      username: 'admin',
      passwordHash,
      roles: [UserRole.ADMIN, UserRole.PASTOR, UserRole.DIRECTOR],
      permissoes: ['*'], // Todas as permissões
      ativo: true,
      
      // Administrativo
      churchId: defaultChurchId,
      departamento: Departamento.ADMINISTRACAO,
      nivelAprovacao: 999, // Máximo
      assinaDocumentos: true,
      limiteFinanceiro: 999999999, // Sem limite
      
      // Auditoria
      observacoes: 'Admin padrão criado automaticamente pelo sistema. Altere a password!',
    });

    await this.usersRepository.save(admin);

    return admin;
  }

  /**
   * CRIAR LÍDER FINANCEIRO DE TESTE (opcional)
   * 
   * Para testes, pode criar um Tesoureiro padrão
   */
  async createDefaultTreasurer() {
    // Usar o mesmo UUID para a iglesia (em vez de string)
    const defaultChurchId = uuidv4();
    
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('Tesoureiro123!', saltRounds);

    const treasurer = this.usersRepository.create({
      nomeCompleto: 'Tesoureiro de Teste',
      apelido: 'Tesoureiro',
      sexo: Sexo.MASCULINO,
      funcaoMinisterial: FuncaoMinisterial.OBREIRO,
      email: 'tesoureiro@esigiejod.com',
      username: 'tesoureiro',
      passwordHash,
      roles: [UserRole.TREASURER],
      churchId: defaultChurchId,
      nivelAprovacao: 2,
      limiteFinanceiro: 5000,
      ativo: true,
    });

    await this.usersRepository.save(treasurer);
  }
}
