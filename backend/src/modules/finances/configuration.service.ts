import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracaoFinanceira } from './entities/configuration.entity';

/**
 * SERVIÇO DE CONFIGURAÇÃO FINANCEIRA (ConfigurationService)
 * 
 * Responsabilidade: Gerir limites e regras financeiras
 * 
 * Funcionalidades:
 * 1. Obter configuração por igreja (com fallback para global)
 * 2. Atualizar limites
 * 3. Validar se valor excede limites
 * 4. Determinar se precisa aprovação adicional
 * 
 * Precedência:
 * 1. Procurar configuração específica da igreja
 * 2. Se não encontrar, usar configuração global (churchId = NULL)
 * 3. Se nenhuma existir, usar defaults hard-coded
 */
@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(ConfiguracaoFinanceira)
    private configRepository: Repository<ConfiguracaoFinanceira>,
  ) {}

  /**
   * Obter configuração para uma igreja
   * 
   * Procura:
   * 1. Configuração específica (churchId = X)
   * 2. Configuração global (churchId = NULL)
   * 3. Defaults hard-coded se nenhuma existir
   */
  async getConfiguration(churchId: string): Promise<ConfiguracaoFinanceira> {
    // Procurar configuração específica da igreja
    let config = await this.configRepository.findOne({
      where: { churchId },
    });

    if (config) {
      return config;
    }

    // Procurar configuração global
    config = await this.configRepository.findOne({
      where: { churchId: null as any },
    });

    if (config) {
      return config;
    }

    // Retornar defaults se nenhuma existir
    return this.getDefaults();
  }

  /**
   * Obter configuração global
   */
  async getGlobalConfiguration(): Promise<ConfiguracaoFinanceira> {
    const config = await this.configRepository.findOne({
      where: { churchId: null as any },
    });

    return config || this.getDefaults();
  }

  /**
   * Defaults hard-coded
   * Usados se nenhuma configuração existir
   */
  private getDefaults(): ConfiguracaoFinanceira {
    const config = new ConfiguracaoFinanceira();
    config.limiteMaxPorRequisicao = 50000; // 50.000 MT
    config.limiteDiario = 500000; // 500.000 MT
    config.limiteMensal = 5000000; // 5.000.000 MT
    config.exigeAprovadorNivel2 = true;
    config.exigeNotificacaoPastorObreiro = true;
    return config;
  }

  /**
   * Validar se valor excede limite por requisição
   * 
   * Retorna:
   * - true se valor é válido (≤ limite)
   * - false se valor excede limite
   */
  async isWithinRequestLimit(
    churchId: string,
    amount: number,
  ): Promise<boolean> {
    const config = await this.getConfiguration(churchId);
    return amount <= Number(config.limiteMaxPorRequisicao);
  }

  /**
   * Validar se valor excede limite
   * 
   * Retorna:
   * - O limite configurado
   * - boolean se excede
   */
  async checkLimitExceeded(
    churchId: string,
    amount: number,
  ): Promise<{ limitExceeded: boolean; limit: number }> {
    const config = await this.getConfiguration(churchId);
    const limit = Number(config.limiteMaxPorRequisicao);
    return {
      limitExceeded: amount > limit,
      limit,
    };
  }

  /**
   * Requer aprovação nível 2?
   * 
   * Retorna true se:
   * 1. exigeAprovadorNivel2 = true na configuração
   * 2. E valor excede limite local
   */
  async requiresLevel2Approval(
    churchId: string,
    amount: number,
  ): Promise<boolean> {
    const config = await this.getConfiguration(churchId);
    if (!config.exigeAprovadorNivel2) {
      return false;
    }

    const limit = Number(config.limiteMaxPorRequisicao);
    return amount > limit;
  }

  /**
   * Requer notificação ao pastor?
   * 
   * Retorna true se:
   * 1. exigeNotificacaoPastorObreiro = true
   * 2. E requisição é de um obreiro
   */
  async requiresPastorNotification(
    churchId: string,
    creatorType: string,
  ): Promise<boolean> {
    const config = await this.getConfiguration(churchId);
    return (
      config.exigeNotificacaoPastorObreiro &&
      creatorType === 'OBREIRO'
    );
  }

  /**
   * Criar ou atualizar configuração
   */
  async updateConfiguration(
    churchId: string | null,
    data: Partial<ConfiguracaoFinanceira>,
    userId: string,
  ): Promise<ConfiguracaoFinanceira> {
    let config = await this.configRepository.findOne({
      where: { churchId: churchId as any },
    });

    if (!config) {
      config = this.configRepository.create({
        churchId: churchId || undefined,
        ...data,
        criadoPor: userId,
      });
    } else {
      Object.assign(config, data);
      config.alteradoPor = userId;
    }

    return this.configRepository.save(config);
  }

  /**
   * Obter limite de despesa por fundo (se configurado)
   */
  async getFundLimit(
    churchId: string,
    fundId: string,
  ): Promise<number | null> {
    // TODO: Implementar quando houver tabela de limites por fundo
    return null;
  }
}
