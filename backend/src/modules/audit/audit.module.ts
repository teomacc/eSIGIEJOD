import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { ChurchScopeGuard } from '../auth/guards/church-scope.guard';
import { AuditController } from './audit.controller';

/**
 * MÓDULO DE AUDITORIA (AuditModule)
 * 
 * Responsabilidade: Registar e gerir logs imutáveis de auditoria
 * 
 * Conceito-chave - IMUTABILIDADE:
 * - Logs de auditoria NUNCA são deletados
 * - Logs de auditoria NUNCA são modificados
 * - Apenas operação permitida é CREATE (inserção)
 * - Sistema mantém histórico completo de TODAS as ações
 * 
 * Compliance & Transparência:
 * - Quem fez cada ação (userId)
 * - O que fez (action type)
 * - Quando fez (timestamp)
 * - Em que contexto (churchId, entityId)
 * - Quais dados foram alterados (changes field)
 * 
 * Fluxo de Auditoria:
 * 1. Usuário realiza ação (criar requisição, aprovar, etc)
 * 2. Sistema executa operação
 * 3. Sistema chama AuditService.logAction()
 * 4. Log é criado com todos os detalhes
 * 5. Log é imutável e permanente
 * 
 * Ações Auditadas:
 * - INCOME_RECORDED: Entrada de dinheiro registada
 * - REQUISITION_CREATED: Requisição criada
 * - REQUISITION_APPROVED: Requisição aprovada
 * - REQUISITION_REJECTED: Requisição rejeitada
 * - FUND_UPDATED: Saldo de fundo atualizado
 * - USER_LOGIN: Usuário fez login
 * - USER_CREATED: Novo usuário criado
 * - SETTINGS_CHANGED: Configuração alterada
 * 
 * TODO: Implementar criptografia de logs sensíveis
 * TODO: Implementar backup automático de logs
 * TODO: Implementar alertas para ações suspeitas
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, ChurchScopeGuard],
  exports: [AuditService],
})
export class AuditModule {}
