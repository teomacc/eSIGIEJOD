import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requisition, RequisitionState, ExpenseCategory, RequisitionMagnitude } from './entities/requisition.entity';
import { User } from '../auth/entities/user.entity';
import { Fund } from '../finances/entities/fund.entity';
import { ConfigService } from '@nestjs/config';

/**
 * SERVIÇO DE SEED DE REQUISIÇÕES (RequisitionsSeeder)
 * 
 * Responsabilidade: Criar requisições de exemplo para demonstração
 * 
 * Cria automaticamente:
 * 1. Requisições pendentes (para testar aprovação)
 * 2. Requisições aprovadas/executadas (para estatísticas)
 * 
 * IMPORTANTE:
 * - Apenas cria se banco estiver vazio
 * - Pode ser desabilitado via ENV: ENABLE_SEEDS=false
 */
@Injectable()
export class RequisitionsSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Requisition)
    private requisitionRepository: Repository<Requisition>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Aguardar um pouco para garantir que as tabelas foram criadas
    await new Promise(resolve => setTimeout(resolve, 3000));
    await this.seedRequisitions();
  }

  private async seedRequisitions() {
    // Verificar se seeds estão habilitados
    const enableSeeds = this.configService.get('ENABLE_SEEDS', 'true');
    if (enableSeeds === 'false') {
      console.log('⏭️  Seeds de requisições desabilitados via ENABLE_SEEDS=false');
      return;
    }

    try {
      // Verificar se já existem requisições
      const existingRequisitions = await this.requisitionRepository.count();
      if (existingRequisitions > 0) {
        console.log('✅ Requisições já existem, pulando seed');
        return;
      }
    } catch (error) {
      console.log('⚠️ Tabelas ainda não existem, pulando seed de requisições');
      return;
    }

    // Buscar admin e fundos
    const admin = await this.userRepository.findOne({ 
      where: { email: 'admin@esigiejod.com' } 
    });

    if (!admin) {
      console.log('⚠️ Admin não encontrado, pulando seed de requisições');
      return;
    }

    const funds = await this.fundRepository.find({ 
      where: { churchId: admin.churchId } 
    });

    if (funds.length === 0) {
      console.log('⚠️ Nenhum fundo encontrado, pulando seed de requisições');
      return;
    }

    const churchId = admin.churchId;
    const now = new Date();

    console.log('🌱 Criando requisições de exemplo...');

    const requisitions = [];

    // 3 REQUISIÇÕES PENDENTES (para aparecer no dashboard)
    requisitions.push(
      this.requisitionRepository.create({
        churchId,
        fundId: funds[0].id,
        requestedBy: admin.id,
        category: ExpenseCategory.FOOD,
        requestedAmount: 8500,
        magnitude: RequisitionMagnitude.SMALL,
        state: RequisitionState.PENDING,
        justification: 'Compra de alimentos para culto de jovens - 50 pessoas',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
      }),
      this.requisitionRepository.create({
        churchId,
        fundId: funds[0].id,
        requestedBy: admin.id,
        category: ExpenseCategory.TRANSPORT,
        requestedAmount: 15000,
        magnitude: RequisitionMagnitude.MEDIUM,
        state: RequisitionState.UNDER_REVIEW,
        justification: 'Transporte para conferência em Maputo',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
      }),
      this.requisitionRepository.create({
        churchId,
        fundId: funds[1]?.id || funds[0].id,
        requestedBy: admin.id,
        category: ExpenseCategory.MAINTENANCE,
        requestedAmount: 65000,
        magnitude: RequisitionMagnitude.LARGE,
        state: RequisitionState.PENDING,
        justification: 'Reparação urgente do telhado da igreja',
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 dias atrás (ATRASADA!)
      }),
    );

    // 2 REQUISIÇÕES CRÍTICAS URGENTES
    requisitions.push(
      this.requisitionRepository.create({
        churchId,
        fundId: funds[0].id,
        requestedBy: admin.id,
        category: ExpenseCategory.HEALTH_EMERGENCY,
        requestedAmount: 75000,
        magnitude: RequisitionMagnitude.CRITICAL,
        state: RequisitionState.PENDING,
        justification: 'Emergência médica - membro hospitalizado',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
      }),
      this.requisitionRepository.create({
        churchId,
        fundId: funds[0].id,
        requestedBy: admin.id,
        category: ExpenseCategory.ENERGY_WATER,
        requestedAmount: 55000,
        magnitude: RequisitionMagnitude.CRITICAL,
        state: RequisitionState.UNDER_REVIEW,
        justification: 'Conta de luz em atraso - risco de corte',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
      }),
    );

    // REQUISIÇÕES EXECUTADAS NO MÊS ATUAL (para estatísticas de despesas)
    for (let i = 0; i < 8; i++) {
      const daysAgo = Math.floor(Math.random() * 25) + 1;
      const createdDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo - 5);
      const executedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);

      const fund = funds[Math.floor(Math.random() * funds.length)];
      const amount = Math.floor(Math.random() * 20000) + 3000; // 3k a 23k

      requisitions.push(
        this.requisitionRepository.create({
          churchId,
          fundId: fund.id,
          requestedBy: admin.id,
          approvedBy: admin.id,
          category: ExpenseCategory.OFFICE_MATERIAL,
          requestedAmount: amount,
          approvedAmount: amount,
          magnitude: RequisitionMagnitude.SMALL,
          state: RequisitionState.EXECUTED,
          justification: `Despesa executada - material de escritório`,
          createdAt: createdDate,
          executedAt: executedDate,
        }),
      );
    }

    // REQUISIÇÕES EXECUTADAS NO MÊS ANTERIOR
    for (let i = 0; i < 6; i++) {
      const day = Math.floor(Math.random() * 25) + 1;
      const createdDate = new Date(now.getFullYear(), now.getMonth() - 1, day - 3);
      const executedDate = new Date(now.getFullYear(), now.getMonth() - 1, day);

      const fund = funds[Math.floor(Math.random() * funds.length)];
      const amount = Math.floor(Math.random() * 18000) + 4000;

      requisitions.push(
        this.requisitionRepository.create({
          churchId,
          fundId: fund.id,
          requestedBy: admin.id,
          approvedBy: admin.id,
          category: ExpenseCategory.LITURGICAL_MATERIAL,
          requestedAmount: amount,
          approvedAmount: amount,
          magnitude: RequisitionMagnitude.SMALL,
          state: RequisitionState.EXECUTED,
          justification: 'Despesa do mês anterior',
          createdAt: createdDate,
          executedAt: executedDate,
        }),
      );
    }

    await this.requisitionRepository.save(requisitions);
    console.log(`✅ ${requisitions.length} requisições criadas`);
    console.log('✅ Seed de requisições concluído!');
  }
}
