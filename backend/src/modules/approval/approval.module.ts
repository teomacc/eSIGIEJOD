import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { FinancesModule } from '../finances/finances.module';

/**
 * MÓDULO DE APROVAÇÃO (ApprovalModule)
 * 
 * Responsabilidade: Implementar lógica de aprovação automática
 * 
 * Conceito-chave - ROTEAMENTO AUTOMÁTICO:
 * O sistema determina automaticamente quem precisa aprovar uma requisição
 * baseado no montante solicitado.
 * 
 * Hierarquia de Aprovação:
 * ≤ 5.000 MT → Tesoureiro Local (TREASURER)
 * 5.001 – 20.000 MT → Director Financeiro (DIRECTOR)
 * 20.001 – 50.000 MT → Conselho de Direcção (BOARD)
 * > 50.000 MT → Pastor Sénior (PASTOR)
 * 
 * Fluxo:
 * 1. Requisição é criada com montante X
 * 2. ApprovalService.calculateApprovalLevel(X) determina quem aprova
 * 3. Requisição é enviada para pessoa apropriada
 * 4. Essa pessoa revisa e aprova/rejeita
 * 5. Se aprovada, transita para próximo estado
 * 6. Todas as ações registadas em AuditLog
 * 
 * Validação Hierárquica:
 * - Pessoa não pode aprovar se não tem autoridade
 * - Pessoa com role PASTOR pode aprovar qualquer montante
 * - Pessoa com role DIRECTOR pode aprovar até 50.000 MT
 * - Pessoa com role TREASURER pode aprovar até 5.000 MT
 * 
 * Thresholds Configuráveis:
 * Valores são configuráveis (devem ser armazenados em BD, não hardcodeados)
 * TODO: Mover para tabela de configuração no BD
 */
@Module({
  imports: [FinancesModule],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
