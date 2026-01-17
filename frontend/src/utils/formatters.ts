/**
 * Utility para formatar enums e valores
 */

export const FUND_TYPE_LABELS: Record<string, string> = {
  FUNDO_GERAL: 'Fundo Geral',
  FUNDO_MISSOES: 'Fundo de Missões',
  FUNDO_CONSTRUCAO: 'Fundo de Construção',
  FUNDO_TRANSPORTE: 'Fundo de Transporte',
  FUNDO_EDUCACAO: 'Fundo de Educação',
  FUNDO_SAUDE: 'Fundo de Saúde',
  FUNDO_MANUTENCAO: 'Fundo de Manutenção',
  FUNDO_DESPESA: 'Fundo de Despesa',
};

export const formatFundType = (type: string): string => {
  return FUND_TYPE_LABELS[type] || type;
};

export const formatCurrencyValue = (value: number | string): string => {
  return Number(value).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });
};
