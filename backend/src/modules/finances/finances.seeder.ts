import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fund, FundType } from './entities/fund.entity';
import { Income, IncomeType } from './entities/income.entity';
import { User } from '../auth/entities/user.entity';

/**
 * SERVIÇO DE SEED DE FINANÇAS (FinancesSeeder)
 * 
 * Responsabilidade: Criar dados iniciais para demonstração
 * 
 * Cria automaticamente:
 * 1. Fundos padrão (GERAL, CONSTRUÇÃO, MISSÕES, etc.)
 * 2. Entradas de exemplo dos últimos 3 meses
 * 
 * IMPORTANTE:
 * - Apenas cria se banco estiver vazio
 * - Usa churchId do admin como referência
 */
@Injectable()
export class FinancesSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedFinances();
  }

  private async seedFinances() {
    // Verificar se já existem fundos
    const existingFunds = await this.fundRepository.count();
    if (existingFunds > 0) {
      console.log('✅ Fundos já existem, pulando seed de finanças');
      return;
    }

    // Buscar admin para usar seu churchId
    const admin = await this.userRepository.findOne({ 
      where: { email: 'admin@esigiejod.com' } 
    });

    if (!admin) {
      console.log('⚠️ Admin não encontrado, pulando seed de finanças');
      return;
    }

    const churchId = admin.churchId;

    console.log('🌱 Criando fundos padrão...');

    // Criar fundos padrão
    const fundTypes = [
      { type: FundType.GENERAL, description: 'Fundo geral para operações da igreja', balance: 500000 },
      { type: FundType.CONSTRUCTION, description: 'Fundo para construção e reformas', balance: 150000 },
      { type: FundType.MISSIONS, description: 'Fundo para projetos missionários', balance: 80000 },
      { type: FundType.SOCIAL, description: 'Fundo para assistência social', balance: 45000 },
      { type: FundType.EVENTS, description: 'Fundo para eventos e conferências', balance: 30000 },
    ];

    const funds = [];
    for (const fundData of fundTypes) {
      const fund = this.fundRepository.create({
        churchId,
        type: fundData.type,
        description: fundData.description,
        balance: fundData.balance,
        isActive: true,
      });
      const savedFund = await this.fundRepository.save(fund);
      funds.push(savedFund);
    }

    console.log(`✅ ${funds.length} fundos criados`);

    console.log('🌱 Criando entradas de exemplo...');

    // Criar entradas dos últimos 3 meses
    const now = new Date();
    const incomes = [];

    // Mês atual (Janeiro 2026)
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
      
      const fund = funds[Math.floor(Math.random() * funds.length)];
      const amount = Math.floor(Math.random() * 50000) + 5000; // 5k a 55k

      const types = [IncomeType.TITHE, IncomeType.OFFERING, IncomeType.SPECIAL_OFFERING];
      const type = types[Math.floor(Math.random() * types.length)];

      incomes.push(this.incomeRepository.create({
        churchId,
        fundId: fund.id,
        recordedBy: admin.id,
        type,
        amount,
        date,
        observations: `Entrada automática de ${type}`,
      }));
    }

    // Mês anterior (Dezembro 2025)
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - 1, Math.floor(Math.random() * 28) + 1);
      
      const fund = funds[Math.floor(Math.random() * funds.length)];
      const amount = Math.floor(Math.random() * 40000) + 5000;

      incomes.push(this.incomeRepository.create({
        churchId,
        fundId: fund.id,
        recordedBy: admin.id,
        type: IncomeType.OFFERING,
        amount,
        date,
        observations: 'Entrada do mês anterior',
      }));
    }

    // Mês retrasado (Novembro 2025)
    for (let i = 0; i < 10; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - 2, Math.floor(Math.random() * 28) + 1);
      
      const fund = funds[Math.floor(Math.random() * funds.length)];
      const amount = Math.floor(Math.random() * 35000) + 5000;

      incomes.push(this.incomeRepository.create({
        churchId,
        fundId: fund.id,
        recordedBy: admin.id,
        type: IncomeType.TITHE,
        amount,
        date,
        observations: 'Entrada histórica',
      }));
    }

    await this.incomeRepository.save(incomes);
    console.log(`✅ ${incomes.length} entradas criadas`);

    console.log('✅ Seed de finanças concluído!');
  }
}
