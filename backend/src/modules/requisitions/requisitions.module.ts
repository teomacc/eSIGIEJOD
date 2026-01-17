import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Requisition } from './entities/requisition.entity';
import { RequisicaoHistorico } from './entities/requisition-history.entity';
import { RequisitionsService } from './requisitions.service';
import { RequisitionsController } from './requisitions.controller.v2';
import { ApprovalModule } from '../approval/approval.module';
import { AuditModule } from '../audit/audit.module';
import { FinancesModule } from '../finances/finances.module';
import { RequisitionsSeeder } from './requisitions.seeder';
import { User } from '../auth/entities/user.entity';
import { Fund } from '../finances/entities/fund.entity';

/**
 * MÓDULO DE REQUISIÇÕES (RequisitionsModule)
 * 
 * Responsabilidade: Gerir fluxo de requisições de despesa
 * 
 * Conceito-chave:
 * MÁQUINA DE ESTADOS - Requisição tem ciclo de vida bem definido:
 * 
 * Criação:
 * PENDING (pendente) → Aguardando primeira revisão
 * ↓
 * UNDER_REVIEW (em análise) → Enviada para aprovador
 * ↓
 * Aprovação/Rejeição:
 * APPROVED (aprovada) → Pode ser executada
 * REJECTED (rejeitada) → Fim do ciclo
 * ↓ (se APPROVED)
 * EXECUTED (executada) → Pagamento realizado
 * ↓ (em qualquer estado)
 * CANCELLED (cancelada) → Fim do ciclo
 * 
 * Fluxo:
 * 1. Criar requisição em estado PENDING
 * 2. Sistema calcula magnitude (Pequena/Média/Grande/Crítica)
 * 3. Sistema determina nível de aprovação necessário
 * 4. Requisição é enviada para aprovador apropriado
 * 5. Aprovador revisa e aprova ou rejeita
 * 6. Se aprovada, pode ser executada (pagamento)
 * 7. TODAS as ações são registadas em AuditLog (imutável)
 */
@Module({
  imports: [
    // Registar Requisition entities
    TypeOrmModule.forFeature([Requisition, RequisicaoHistorico, User, Fund]),
    // Importar módulos
    ApprovalModule,
    AuditModule,
    FinancesModule, // Para ConfigurationService e ExpenseService
  ],
  controllers: [RequisitionsController],
  providers: [RequisitionsService, RequisitionsSeeder],
  exports: [RequisitionsService],
})
export class RequisitionsModule {}
