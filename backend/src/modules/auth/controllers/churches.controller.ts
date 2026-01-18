import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChurchService } from '../services/church.service';
import { CreateChurchDto, UpdateChurchDto, ChurchResponseDto } from '../dto/church.dto';
import { ChurchScopeGuard } from '../guards/church-scope.guard';
import { UserRole } from '../entities/user.entity';

/**
 * CONTROLADOR DE IGREJAS (ChurchesController)
 * 
 * ROTAS:
 * - POST   /churches                             → Criar nova igreja (ADMIN)
 * - GET    /churches                             → Listar igrejas
 * - GET    /churches/:id                         → Obter detalhes da igreja
 * - PUT    /churches/:id                         → Atualizar dados da igreja
 * - DELETE /churches/:id                         → Deletar/desativar igreja
 * - PUT    /churches/:id/pastor                  → Atribuir pastor local
 * - PUT    /churches/:id/lider-financeiro        → Atribuir líder financeiro
 * 
 * GUARDAS:
 * - AuthGuard('jwt')     → Requer autenticação
 * - ChurchScopeGuard     → Valida isolamento de igrejas
 * 
 * REGRAS DE ACESSO:
 * - ADMIN                    → Acesso total a todas as igrejas
 * - PASTOR_PRESIDENTE        → Acesso total (role global)
 * - LIDER_FINANCEIRO_GERAL   → Acesso total (role global)
 * - PASTOR_LOCAL             → Acesso apenas à sua própria igreja
 * - LIDER_FINANCEIRO_LOCAL   → Acesso apenas à sua própria igreja
 */
@Controller('churches')
@UseGuards(AuthGuard('jwt'), ChurchScopeGuard)
export class ChurchesController {
  constructor(private churchService: ChurchService) {}

  /**
   * CRIAR IGREJA
   * 
   * POST /churches
   * 
   * Corpo:
   * {
   *   "nome": "Igreja Assembléia de Deus Central",
   *   "codigo": "IGAD-MAP-01",
   *   "pastorLocalId": "uuid-pastor",         (opcional)
   *   "liderFinanceiroLocalId": "uuid-lider"  (opcional)
   * }
   * 
   * Retorna: ChurchResponseDto
   * 
   * Permissões: ADMIN apenas
   */
  @Post()
  async createChurch(
    @Body() dto: CreateChurchDto,
    @Request() req: any,
  ): Promise<ChurchResponseDto> {
    // 1. VALIDAR PERMISSÃO (apenas ADMIN)
    if (!req.user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Apenas ADMIN pode criar igrejas');
    }

    // 2. CRIAR IGREJA
    // IMPORTANTE: Usar req.user.userId (não req.user.id)
    // O JWT strategy retorna { userId, email, roles, churchId }
    return this.churchService.createChurch(dto, req.user.userId, req.user.churchId);
  }

  /**
   * LISTAR IGREJAS
   * 
   * GET /churches
   * 
   * Retorna: ChurchResponseDto[]
   * 
   * Permissões:
   * - ADMIN                  → Vê todas as igrejas
   * - Outras roles globais   → Veem todas as igrejas
   * - Roles locais          → Só veem sua própria igreja (filtrado pelo ChurchScopeGuard)
   */
  @Get()
  async listChurches(): Promise<ChurchResponseDto[]> {
    // Usuários globais (ADMIN, PASTOR_PRESIDENTE, LFG) veem todas as igrejas
    // Incluindo as desactivadas (para histórico e gestão)
    // Usuários locais veem apenas a sua igreja (req.churchId)
    return this.churchService.listChurches(false); // false = incluir todas, activas e desactivadas
  }

  /**
   * OBTER IGREJA
   * 
   * GET /churches/:id
   * 
   * Parâmetros:
   * - id: UUID da igreja
   * 
   * Retorna: ChurchResponseDto
   * 
   * Validação: ChurchScopeGuard verifica se usuário tem acesso a esta igreja
   */
  @Get(':id')
  async getChurch(
    @Param('id') churchId: string,
    @Request() req: any,
  ): Promise<ChurchResponseDto> {
    // ChurchScopeGuard já validou que o usuário pode acessar esta igreja
    const isGlobal = this.isGlobalRole(req.user.roles);
    
    if (!isGlobal && req.churchId !== churchId) {
      throw new ForbiddenException('Você não tem acesso a esta igreja');
    }

    return this.churchService.getChurch(churchId);
  }

  /**
   * ATUALIZAR IGREJA
   * 
   * PUT /churches/:id
   * 
   * Parâmetros:
   * - id: UUID da igreja
   * 
   * Corpo (todos opcionais):
   * {
   *   "nome": "novo nome",
   *   "activa": true/false,
   *   "pastorLocalId": "novo-uuid",
   *   "liderFinanceiroLocalId": "novo-uuid"
   * }
   * 
   * Retorna: ChurchResponseDto
   * 
   * Permissões:
   * - ADMIN                              → Pode atualizar qualquer campo de qualquer igreja
   * - PASTOR_PRESIDENTE, LFG            → Podem atualizar qualquer campo
   * - PASTOR_LOCAL, LIDER_FINANCEIRO    → Podem atualizar apenas sua própria igreja,
   *                                         mas não podem desativar
   */
  @Put(':id')
  async updateChurch(
    @Param('id') churchId: string,
    @Body() dto: UpdateChurchDto,
    @Request() req: any,
  ): Promise<ChurchResponseDto> {
    const isGlobal = this.isGlobalRole(req.user.roles);
    const isOwner = req.churchId === churchId;

    // Verificar permissão básica
    if (!isGlobal && !isOwner) {
      throw new ForbiddenException('Você não tem acesso a esta igreja');
    }

    // Usuários locais não podem desativar sua própria igreja
    if (!isGlobal && dto.activa === false) {
      throw new ForbiddenException('Você não pode desativar sua própria igreja');
    }

    return this.churchService.updateChurch(churchId, dto, req.user.userId, req.churchId);
  }

  /**
   * DELETAR/DESATIVAR IGREJA
   * 
   * DELETE /churches/:id
   * 
   * Na verdade, DESATIVA a igreja (não deleta dados)
   * 
   * Permissões: ADMIN apenas
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChurch(
    @Param('id') churchId: string,
    @Request() req: any,
  ): Promise<void> {
    // Apenas ADMIN pode desativar igrejas
    if (!req.user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Apenas ADMIN pode desativar igrejas');
    }

    await this.churchService.toggleChurchStatus(churchId, false, req.user.userId, req.churchId);
  }

  /**
   * ATRIBUIR PASTOR LOCAL
   * 
   * PUT /churches/:id/pastor
   * 
   * Corpo:
   * {
   *   "pastorId": "uuid-novo-pastor"
   * }
   * 
   * Retorna: ChurchResponseDto
   * 
   * Permissões:
   * - ADMIN                              → Qualquer igreja
   * - PASTOR_PRESIDENTE, LFG            → Qualquer igreja
   * - PASTOR_LOCAL, LIDER_FINANCEIRO    → Apenas sua própria igreja
   */
  @Put(':id/pastor')
  async assignLocalPastor(
    @Param('id') churchId: string,
    @Body() dto: { pastorId: string },
    @Request() req: any,
  ): Promise<ChurchResponseDto> {
    const isGlobal = this.isGlobalRole(req.user.roles);
    const isOwner = req.churchId === churchId;

    if (!isGlobal && !isOwner) {
      throw new ForbiddenException('Você não tem acesso a esta igreja');
    }

    if (!dto.pastorId) {
      throw new BadRequestException('pastorId é obrigatório');
    }

    return this.churchService.assignLocalPastor(churchId, dto.pastorId, req.user.userId, req.churchId);
  }

  /**
   * ATRIBUIR LÍDER FINANCEIRO LOCAL
   * 
   * PUT /churches/:id/lider-financeiro
   * 
   * Corpo:
   * {
   *   "liderId": "uuid-novo-lider"
   * }
   * 
   * Retorna: ChurchResponseDto
   * 
   * Permissões: Mesmo que assignLocalPastor
   */
  @Put(':id/lider-financeiro')
  async assignLocalFinancialLead(
    @Param('id') churchId: string,
    @Body() dto: { liderId: string },
    @Request() req: any,
  ): Promise<ChurchResponseDto> {
    const isGlobal = this.isGlobalRole(req.user.roles);
    const isOwner = req.churchId === churchId;

    if (!isGlobal && !isOwner) {
      throw new ForbiddenException('Você não tem acesso a esta igreja');
    }

    if (!dto.liderId) {
      throw new BadRequestException('liderId é obrigatório');
    }

    return this.churchService.assignLocalFinancialLead(
      churchId,
      dto.liderId,
      req.user.userId,
      req.churchId,
    );
  }

  /**
   * HELPER: Verificar se role é global
   * 
   * Roles globais: ADMIN, PASTOR_PRESIDENTE, LIDER_FINANCEIRO_GERAL
   * Roles locais: PASTOR_LOCAL, LIDER_FINANCEIRO_LOCAL, OBREIRO
   */
  private isGlobalRole(roles: UserRole[]): boolean {
    const globalRoles = [
      UserRole.ADMIN,
      UserRole.PASTOR_PRESIDENTE,
      UserRole.LIDER_FINANCEIRO_GERAL,
    ];
    return roles.some((role) => globalRoles.includes(role));
  }
}
