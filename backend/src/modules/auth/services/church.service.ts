import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Church } from '../entities/church.entity';
import { CreateChurchDto, UpdateChurchDto, ChurchResponseDto } from '../dto/church.dto';
import { User, UserRole } from '../entities/user.entity';
import { Fund, FundType } from '../../finances/entities/fund.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';

/**
 * SERVIÇO DE IGREJAS (ChurchService)
 * 
 * Responsabilidade: Gerir entidades e dados de igrejas
 * 
 * Funcionalidades:
 * 1. Criar nova igreja
 * 2. Listar todas as igrejas
 * 3. Obter detalhes de uma igreja
 * 4. Atualizar dados da igreja
 * 5. Ativar/desativar igreja
 * 6. Atribuir pastor local e líder financeiro
 * 
 * Validações:
 * - Código da igreja deve ser único
 * - Apenas ADMIN pode criar/atualizar igrejas
 * - Pastor local e líder financeiro devem existir
 * - Não pode remover pastor/líder sem atribuir novo
 */
@Injectable()
export class ChurchService {
  constructor(
    @InjectRepository(Church)
    private churchRepository: Repository<Church>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    private auditService: AuditService,
  ) {}

  /**
   * CRIAR IGREJA - createChurch()
   * 
   * Parâmetros:
   * - dto: CreateChurchDto { nome, codigo, pastorLocalId?, liderFinanceiroLocalId? }
   * - userId: ID do usuário que está criando
   * - churchId?: ID da igreja do usuário (para auditoria)
   * 
   * Validações:
   * - Código deve ser único
   * - Pastor local e líder financeiro devem existir (se fornecidos)
   * 
   * Retorna: ChurchResponseDto
   */
  async createChurch(
    dto: CreateChurchDto,
    userId: string,
    churchId?: string,
  ): Promise<ChurchResponseDto> {
    // VALIDAÇÃO CRÍTICA: userId deve ser fornecido
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('userId é obrigatório para auditoria');
    }
    // 1. GERAR CÓDIGO AUTOMATICAMENTE
    // Formato: IEJOD-SUFIXO (ex: IEJOD-DJUBA, IEJOD-SEDE)
    let codigo = dto.codigo;
    if (!codigo) {
      // Extrair última palavra do nome (sufixo)
      const partes = dto.nome.trim().toUpperCase().split(/\s+/);
      const sufixo = partes[partes.length - 1].substring(0, 6); // Máximo 6 caracteres
      codigo = `IEJOD-${sufixo}`;
    }

    // 2. VALIDAR CÓDIGO Único
    const existingChurch = await this.churchRepository.findOne({
      where: { codigo },
    });

    if (existingChurch) {
      const status = existingChurch.activa ? 'activa' : 'desactivada';
      throw new ConflictException(
        `Não é possível criar esta igreja. O código "${codigo}" já existe em outra igreja ${status}. ` +
        `Por favor, use um nome diferente para gerar um código único.`
      );
    }

    // 2. VALIDAR USUÁRIOS (pastor local e líder financeiro)
    if (dto.pastorLocalId) {
      const pastor = await this.userRepository.findOne({
        where: { id: dto.pastorLocalId },
      });
      if (!pastor) {
        throw new BadRequestException('Pastor local não encontrado');
      }

      // Verificar se tem role de pastor
      if (!pastor.roles.includes(UserRole.PASTOR_LOCAL)) {
        throw new BadRequestException('Usuário não tem role de PASTOR_LOCAL');
      }
    }

    if (dto.liderFinanceiroLocalId) {
      const lider = await this.userRepository.findOne({
        where: { id: dto.liderFinanceiroLocalId },
      });
      if (!lider) {
        throw new BadRequestException('Líder financeiro não encontrado');
      }

      if (!lider.roles.includes(UserRole.LIDER_FINANCEIRO_LOCAL)) {
        throw new BadRequestException('Usuário não tem role de LIDER_FINANCEIRO_LOCAL');
      }
    }

    // 3. CRIAR IGREJA
    const church = this.churchRepository.create({
      nome: dto.nome,
      codigo,
      pastorLocalId: dto.pastorLocalId,
      liderFinanceiroLocalId: dto.liderFinanceiroLocalId,
      activa: true,
    });

    const saved = await this.churchRepository.save(church);

    // 3.5. CRIAR FUNDOS PADRÃO PARA A IGREJA
    const fundosDefault = [
      FundType.GENERAL,
      FundType.CONSTRUCTION,
      FundType.MISSIONS,
      FundType.SOCIAL,
      FundType.EVENTS,
      FundType.EMERGENCY,
      FundType.SPECIAL_PROJECTS,
      FundType.YOUTH,
      FundType.WOMEN,
      FundType.MAINTENANCE,
    ];

    try {
      for (const fundoType of fundosDefault) {
        await this.fundRepository.save({
          churchId: saved.id,
          type: fundoType,
          balance: 0,
          isActive: true,
          description: this.formatFundTypeName(fundoType),
        });
      }
    } catch (error) {
      console.error('Erro ao criar fundos padrão para Igreja:', error);
      // Não lançar erro - a Igreja foi criada com sucesso mesmo se os fundos falharem
    }

    // 4. REGISTRAR AUDITORIA
    // IMPORTANTE: Passar userId explicitamente (não pode ser null, BD tem constraint NOT NULL)
    const auditData = {
      churchId: churchId || saved.id,
      userId: userId, // Sempre vem do controller (req.user.id)
      action: AuditAction.CHURCH_CREATED,
      entityId: saved.id,
      entityType: 'Church',
      changes: {
        before: null,
        after: {
          nome: saved.nome,
          codigo: saved.codigo,
          pastorLocalId: saved.pastorLocalId,
          liderFinanceiroLocalId: saved.liderFinanceiroLocalId,
        },
      },
      description: `Igreja "${saved.nome}" criada`,
    };

    // DEBUG: Log os dados de auditoria antes de salvar
    console.log('[AUDIT] Creating audit log with data:', {
      churchId: auditData.churchId,
      userId: auditData.userId,
      action: auditData.action,
      entityId: auditData.entityId,
    });

    await this.auditService.logAction(auditData);

    return this.mapToResponse(saved);
  }

  /**
   * LISTAR IGREJAS - listChurches()
   * 
   * Retorna todas as igrejas ativas
   * Ordenadas por nome
   */
  async listChurches(onlyActive: boolean = true): Promise<ChurchResponseDto[]> {
    const query = this.churchRepository.createQueryBuilder('church');

    if (onlyActive) {
      query.where('church.activa = true');
    }

    const churches = await query.orderBy('church.nome', 'ASC').getMany();

    return churches.map((c) => this.mapToResponse(c));
  }

  /**
   * OBTER IGREJA - getChurch()
   * 
   * Parâmetro: churchId (UUID)
   * 
   * Retorna: ChurchResponseDto ou null se não encontrado
   */
  async getChurch(churchId: string): Promise<ChurchResponseDto> {
    const church = await this.churchRepository.findOne({
      where: { id: churchId },
    });

    if (!church) {
      throw new NotFoundException(`Igreja com ID "${churchId}" não encontrada`);
    }

    return this.mapToResponse(church);
  }

  /**
   * OBTER IGREJA POR CÓDIGO - getChurchByCode()
   * 
   * Parâmetro: codigo (string)
   * 
   * Usado para validar codigo único antes de criar
   */
  async getChurchByCode(codigo: string): Promise<Church | null> {
    return this.churchRepository.findOne({
      where: { codigo },
    });
  }

  /**
   * ATUALIZAR IGREJA - updateChurch()
   * 
   * Parâmetros:
   * - churchId: ID da igreja a atualizar
   * - dto: UpdateChurchDto
   * - userId: ID do usuário que está atualizando
   * - requestChurchId?: ID da igreja do usuário (para auditoria)
   * 
   * Pode atualizar:
   * - Nome
   * - Status ativo/inativo
   * - Pastor local
   * - Líder financeiro
   */
  async updateChurch(
    churchId: string,
    dto: UpdateChurchDto,
    userId: string,
    requestChurchId?: string,
  ): Promise<ChurchResponseDto> {
    // 1. BUSCAR IGREJA
    const church = await this.churchRepository.findOne({
      where: { id: churchId },
    });

    if (!church) {
      throw new NotFoundException(`Igreja não encontrada`);
    }

    // 2. VALIDAR NOVOS USUÁRIOS (se fornecidos)
    if (dto.pastorLocalId && dto.pastorLocalId !== church.pastorLocalId) {
      const pastor = await this.userRepository.findOne({
        where: { id: dto.pastorLocalId },
      });
      if (!pastor) {
        throw new BadRequestException('Pastor local não encontrado');
      }
      if (!pastor.roles.includes(UserRole.PASTOR_LOCAL)) {
        throw new BadRequestException('Usuário não tem role de PASTOR_LOCAL');
      }
    }

    if (dto.liderFinanceiroLocalId && dto.liderFinanceiroLocalId !== church.liderFinanceiroLocalId) {
      const lider = await this.userRepository.findOne({
        where: { id: dto.liderFinanceiroLocalId },
      });
      if (!lider) {
        throw new BadRequestException('Líder financeiro não encontrado');
      }
      if (!lider.roles.includes(UserRole.LIDER_FINANCEIRO_LOCAL)) {
        throw new BadRequestException('Usuário não tem role de LIDER_FINANCEIRO_LOCAL');
      }
    }

    // 3. PREPARAR MUDANÇAS PARA AUDITORIA
    const before = {
      nome: church.nome,
      activa: church.activa,
      pastorLocalId: church.pastorLocalId,
      liderFinanceiroLocalId: church.liderFinanceiroLocalId,
    };

    // 4. ATUALIZAR
    if (dto.nome !== undefined) church.nome = dto.nome;
    if (dto.activa !== undefined) church.activa = dto.activa;
    if (dto.pastorLocalId !== undefined) church.pastorLocalId = dto.pastorLocalId;
    if (dto.liderFinanceiroLocalId !== undefined) {
      church.liderFinanceiroLocalId = dto.liderFinanceiroLocalId;
    }

    const updated = await this.churchRepository.save(church);

    const after = {
      nome: updated.nome,
      activa: updated.activa,
      pastorLocalId: updated.pastorLocalId,
      liderFinanceiroLocalId: updated.liderFinanceiroLocalId,
    };

    // 5. REGISTRAR AUDITORIA
    await this.auditService.logAction({
      churchId: requestChurchId || churchId,
      userId,
      action: AuditAction.CHURCH_UPDATED,
      entityId: churchId,
      entityType: 'Church',
      changes: { before, after },
      description: `Igreja "${updated.nome}" atualizada`,
    });

    return this.mapToResponse(updated);
  }

  /**
   * ATIVAR/DESATIVAR IGREJA - toggleChurchStatus()
   * 
   * Parâmetros:
   * - churchId: ID da igreja
   * - active: true para ativar, false para desativar
   * - userId: ID do usuário
   * - requestChurchId?: Para auditoria
   */
  async toggleChurchStatus(
    churchId: string,
    active: boolean,
    userId: string,
    requestChurchId?: string,
  ): Promise<ChurchResponseDto> {
    const church = await this.churchRepository.findOne({
      where: { id: churchId },
    });

    if (!church) {
      throw new NotFoundException('Igreja não encontrada');
    }

    const wasBefore = church.activa;
    church.activa = active;

    const updated = await this.churchRepository.save(church);

    await this.auditService.logAction({
      churchId: requestChurchId || churchId,
      userId,
      action: active ? AuditAction.CHURCH_ACTIVATED : AuditAction.CHURCH_DEACTIVATED,
      entityId: churchId,
      entityType: 'Church',
      changes: {
        before: { activa: wasBefore },
        after: { activa: active },
      },
      description: `Igreja "${updated.nome}" ${active ? 'ativada' : 'desativada'}`,
    });

    return this.mapToResponse(updated);
  }

  /**
   * ATRIBUIR PASTOR LOCAL - assignLocalPastor()
   * 
   * Parâmetros:
   * - churchId: ID da igreja
   * - pastorId: ID do novo pastor
   * - userId: ID do usuário que está atribuindo
   */
  async assignLocalPastor(
    churchId: string,
    pastorId: string,
    userId: string,
    requestChurchId?: string,
  ): Promise<ChurchResponseDto> {
    const church = await this.churchRepository.findOne({
      where: { id: churchId },
    });

    if (!church) {
      throw new NotFoundException('Igreja não encontrada');
    }

    const pastor = await this.userRepository.findOne({
      where: { id: pastorId },
    });

    if (!pastor) {
      throw new BadRequestException('Pastor não encontrado');
    }

    if (!pastor.roles.includes(UserRole.PASTOR_LOCAL)) {
      throw new BadRequestException('Usuário não tem role de PASTOR_LOCAL');
    }

    const oldPastor = church.pastorLocalId;
    church.pastorLocalId = pastorId;

    const updated = await this.churchRepository.save(church);

    await this.auditService.logAction({
      churchId: requestChurchId || churchId,
      userId,
      action: AuditAction.CHURCH_UPDATED,
      entityId: churchId,
      entityType: 'Church',
      changes: {
        before: { pastorLocalId: oldPastor },
        after: { pastorLocalId: pastorId },
      },
      description: `Pastor local da igreja "${updated.nome}" atualizado`,
    });

    return this.mapToResponse(updated);
  }

  /**
   * ATRIBUIR LÍDER FINANCEIRO LOCAL - assignLocalFinancialLead()
   */
  async assignLocalFinancialLead(
    churchId: string,
    liderId: string,
    userId: string,
    requestChurchId?: string,
  ): Promise<ChurchResponseDto> {
    const church = await this.churchRepository.findOne({
      where: { id: churchId },
    });

    if (!church) {
      throw new NotFoundException('Igreja não encontrada');
    }

    const lider = await this.userRepository.findOne({
      where: { id: liderId },
    });

    if (!lider) {
      throw new BadRequestException('Líder financeiro não encontrado');
    }

    if (!lider.roles.includes(UserRole.LIDER_FINANCEIRO_LOCAL)) {
      throw new BadRequestException('Usuário não tem role de LIDER_FINANCEIRO_LOCAL');
    }

    const oldLider = church.liderFinanceiroLocalId;
    church.liderFinanceiroLocalId = liderId;

    const updated = await this.churchRepository.save(church);

    await this.auditService.logAction({
      churchId: requestChurchId || churchId,
      userId,
      action: AuditAction.CHURCH_UPDATED,
      entityId: churchId,
      entityType: 'Church',
      changes: {
        before: { liderFinanceiroLocalId: oldLider },
        after: { liderFinanceiroLocalId: liderId },
      },
      description: `Líder financeiro da igreja "${updated.nome}" atualizado`,
    });

    return this.mapToResponse(updated);
  }

  /**
   * MAPEAR CHURCH PARA RESPONSE DTO
   */
  private mapToResponse(church: Church): ChurchResponseDto {
    return {
      id: church.id,
      nome: church.nome,
      codigo: church.codigo,
      activa: church.activa,
      pastorLocalId: church.pastorLocalId,
      liderFinanceiroLocalId: church.liderFinanceiroLocalId,
      createdAt: church.createdAt,
      updatedAt: church.updatedAt,
    };
  }

  private formatFundTypeName(fundoType: FundType): string {
    const mapping: Record<FundType, string> = {
      [FundType.GENERAL]: 'Fundo Geral',
      [FundType.CONSTRUCTION]: 'Fundo de Construção',
      [FundType.MISSIONS]: 'Fundo de Missões',
      [FundType.SOCIAL]: 'Fundo Social',
      [FundType.EVENTS]: 'Fundo de Eventos',
      [FundType.EMERGENCY]: 'Fundo de Emergência',
      [FundType.SPECIAL_PROJECTS]: 'Fundo de Projectos Especiais',
      [FundType.YOUTH]: 'Fundo da Juventude',
      [FundType.WOMEN]: 'Fundo das Mulheres',
      [FundType.MAINTENANCE]: 'Fundo de Manutenção',
    };
    return mapping[fundoType] || fundoType;
  }
}
