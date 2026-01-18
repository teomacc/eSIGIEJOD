import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ChurchScopeGuard } from '../auth/guards/church-scope.guard';
import { Income } from '../finances/entities/income.entity';
import { Fund } from '../finances/entities/fund.entity';
import { Requisition } from '../requisitions/entities/requisition.entity';

/**
 * MÓDULO DE DASHBOARD (DashboardModule)
 * 
 * Responsabilidade: Agregar dados de múltiplos módulos para dashboard
 * 
 * Imports:
 * - TypeORM entities: Income, Fund, Requisition
 * 
 * Exports:
 * - DashboardService (caso outros módulos precisem)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Income, Fund, Requisition]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, ChurchScopeGuard],
  exports: [DashboardService],
})
export class DashboardModule {}
