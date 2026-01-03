import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Income } from '../finances/entities/income.entity';
import { Fund } from '../finances/entities/fund.entity';
import { Requisition } from '../requisitions/entities/requisition.entity';
import { AuditService } from '../audit/audit.service';

/**
 * MÓDULO DE RELATÓRIOS (ReportsModule)
 * 
 * Responsabilidade: Gerar relatórios e analytics para insights de negócio
 * 
 * Funcionalidades Principais:
 * 1. Relatórios Financeiros
 *    - Receita total por período
 *    - Distribuição por tipo de income
 *    - Balanço de fundos
 *    - Histórico mensal/anual
 * 
 * 2. Relatórios de Requisições
 *    - Requisições aprovadas/rejeitadas
 *    - Tempo médio de aprovação
 *    - Despesas por categoria
 *    - Aprovadores mais ativos
 * 
 * 3. Relatórios de Compliance
 *    - Auditoria por período
 *    - Atividade de usuário
 *    - Mutações de dados
 *    - Compliance score
 * 
 * 4. Detecção de Anomalias (Futura)
 *    - Transações incomuns
 *    - Padrões suspeitos
 *    - Machine Learning ready
 * 
 * Entities Utilizadas:
 * - AuditLog: Para análise de auditoria
 * - Income: Para análise financeira
 * - Fund: Para balanços
 * - Requisition: Para análise de despesas
 * 
 * Integrações:
 * - AuditService: Log automático de relatórios gerados
 * - QueryBuilder: Para queries complexas e agregações
 * 
 * Fluxo de Geração:
 * 1. Controller recebe GET request com parâmetros (período, tipo)
 * 2. ReportsService consulta BD com QueryBuilder
 * 3. ReportsService processa e agrega dados
 * 4. ReportsService registra geração em AuditLog
 * 5. Controller retorna relatório em JSON
 * 
 * Otimizações:
 * - Índices em AuditLog para queries rápidas
 * - Agregação de dados em nível de BD quando possível
 * - Cache futuro para relatórios frequentes
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, Income, Fund, Requisition]),
  ],
  providers: [ReportsService, AuditService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
