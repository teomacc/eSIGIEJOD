import React from 'react';
import '@/styles/ViewExpenseDetailModal.css';

interface Despesa {
  id: string;
  requisicaoId?: string;
  churchId: string;
  fundId: string;
  valor: number | string;
  dataPagamento: string;
  executadoPor: string;
  comprovativoUrl?: string;
  observacoes?: string;
  requisicao?: {
    id: string;
    code: string;
    justification?: string;
    fundId?: string;
    category?: string;
  };
}

interface ViewExpenseDetailModalProps {
  despesa: Despesa;
  churchName: string;
  executorName: string;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  ALIMENTACAO: 'Alimentação',
  TRANSPORTE: 'Transporte',
  HOSPEDAGEM: 'Hospedagem',
  MATERIAL_ESCRITORIO: 'Material de Escritório',
  MATERIAL_LITURGICO: 'Material Litúrgico',
  EQUIPAMENTOS: 'Equipamentos',
  MANUTENCAO: 'Manutenção',
  APOIO_SOCIAL: 'Apoio Social',
  ORGANIZACAO_EVENTOS: 'Organização de Eventos',
  FORMACAO_SEMINARIOS: 'Formação/Seminários',
  SAUDE_EMERGENCIA: 'Saúde/Emergência',
  PROJECTOS_MISSIONARIOS: 'Projetos Missionários',
  COMUNICACAO: 'Comunicação',
  ENERGIA_AGUA: 'Energia/Água',
  COMBUSTIVEL: 'Combustível',
  OUTROS: 'Outros',
};

export default function ViewExpenseDetailModal({
  despesa,
  churchName,
  executorName,
  onClose,
}: ViewExpenseDetailModalProps) {
  const formatCurrency = (value: number | string) =>
    Number(value).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const categoryLabel = despesa.requisicao?.category
    ? CATEGORY_LABELS[despesa.requisicao.category] || despesa.requisicao.category
    : 'N/A';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content expense-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💰 Detalhes da Despesa</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h3>Informações Gerais</h3>
            <div className="detail-row">
              <span className="detail-label">Código:</span>
              <span className="detail-value">{despesa.requisicao?.code ?? 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Descrição:</span>
              <span className="detail-value">
                {despesa.requisicao?.justification ?? despesa.observacoes ?? 'Sem descrição'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Categoria:</span>
              <span className="detail-value">{categoryLabel}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Valor:</span>
              <span className="detail-value detail-amount">{formatCurrency(despesa.valor)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Execução</h3>
            <div className="detail-row">
              <span className="detail-label">Data de Pagamento:</span>
              <span className="detail-value">{formatDate(despesa.dataPagamento)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Executado por:</span>
              <span className="detail-value">{executorName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Igreja:</span>
              <span className="detail-value">{churchName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Origem:</span>
              <span className="detail-value">
                {despesa.requisicaoId ? '📋 Via Requisição' : '✏️ Entrada Direta'}
              </span>
            </div>
          </div>

          {despesa.comprovativoUrl && (
            <div className="detail-section">
              <h3>Comprovativo</h3>
              <a
                href={despesa.comprovativoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-view-doc"
              >
                📄 Ver Documento
              </a>
            </div>
          )}

          {despesa.observacoes && (
            <div className="detail-section">
              <h3>Observações</h3>
              <p className="detail-observations">{despesa.observacoes}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
