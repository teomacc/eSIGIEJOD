import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Income } from './entities/income.entity';
import { Fund } from './entities/fund.entity';
import { FinancesService } from './finances.service';
import { FinancesController } from './finances.controller';

/**
 * MÓDULO DE FINANÇAS (FinancesModule)
 * 
 * Responsabilidade: Gerir entradas de dinheiro e saldos de fundos
 * 
 * Conceitos-chave:
 * - IMUTABILIDADE: Entradas não podem ser deletadas, apenas criadas
 * - FUNDOS: 10 tipos de fundos diferentes (Geral, Construção, Missões, etc.)
 * - ISOLAMENTO: Cada entrada pertence a uma iglesia específica (churchId)
 * 
 * Entidades:
 * 1. Fund: Representa um tipo de fundo e seu saldo
 * 2. Income: Registro imutável de uma entrada de dinheiro
 * 
 * Fluxo de Entrada:
 * 1. Tesoureiro registra dinheiro recebido
 * 2. Especifica: tipo (dízimo, oferta, etc), montante, fundo
 * 3. FinancesService cria entrada imutável
 * 4. FinancesService atualiza saldo do fundo
 * 5. AuditService registra a ação
 * 
 * TODO: Implementar validações de limite mensal por fundo
 */
@Module({
  imports: [
    // Registar entities para TypeORM gerenciar
    TypeOrmModule.forFeature([Income, Fund]),
  ],
  controllers: [FinancesController],
  providers: [FinancesService],
  // Exportar FinancesService para ser utilizado por outros módulos
  exports: [FinancesService],
})
export class FinancesModule {}
