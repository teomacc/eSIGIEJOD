import React from 'react';
import '@/styles/ViewRequisitionFromExpenseModal.css';

interface Requisicao {
  id: string;
  code: string;
  justification?: string;
  category?: string;
  valor: number;
  estado: string;
  criadoEm: string;
  aprovadoEm?: string;
  executadoEm?: string;
  solicitadoPor?: string;
  aprovadoPor?: string;
  executadoPor?: string;
}

interface ViewRequisitionFromExpenseModalProps {
  requisicaoId: string;
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

export default function ViewRequisitionFromExpenseModal({
  requisicaoId,
  onClose,
}: ViewRequisitionFromExpenseModalProps) {
  const [requisicao, setRequisicao] = React.useState<Requisicao | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRequisicao = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/requisitions/${requisicaoId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) throw new Error('Erro ao carregar requisição');
        const data = await response.json();
        setRequisicao(data);
      } catch (err: any) {
        setError(err.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchRequisicao();
  }, [requisicaoId]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const getStatusBadge = (estado: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      PENDENTE: { label: '⏳ Pendente', className: 'badge-pending' },
      EM_ANALISE: { label: '🔍 Em Análise', className: 'badge-review' },
      APROVADA: { label: '✅ Aprovada', className: 'badge-approved' },
      EXECUTADA: { label: '✔️ Executada', className: 'badge-executed' },
      REJEITADA: { label: '❌ Rejeitada', className: 'badge-rejected' },
    };
    return badges[estado] || { label: estado, className: 'badge-unknown' };
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content requisition-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            <p>Carregando requisição...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !requisicao) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content requisition-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Erro</h2>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <p>{error || 'Requisição não encontrada'}</p>
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

  const statusBadge = getStatusBadge(requisicao.estado);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content requisition-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Requisição {requisicao.code}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="status-badge-container">
            <span className={`status-badge ${statusBadge.className}`}>{statusBadge.label}</span>
          </div>

          <div className="detail-section">
            <h3>Informações da Requisição</h3>
            <div className="detail-row">
              <span className="detail-label">Código:</span>
              <span className="detail-value">{requisicao.code}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Justificação:</span>
              <span className="detail-value">{requisicao.justification || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Categoria:</span>
              <span className="detail-value">
                {requisicao.category ? CATEGORY_LABELS[requisicao.category] || requisicao.category : 'N/A'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Valor:</span>
              <span className="detail-value detail-amount">{formatCurrency(requisicao.valor)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Timeline</h3>
            <div className="detail-row">
              <span className="detail-label">Criada em:</span>
              <span className="detail-value">{formatDate(requisicao.criadoEm)}</span>
            </div>
            {requisicao.aprovadoEm && (
              <div className="detail-row">
                <span className="detail-label">Aprovada em:</span>
                <span className="detail-value">{formatDate(requisicao.aprovadoEm)}</span>
              </div>
            )}
            {requisicao.executadoEm && (
              <div className="detail-row">
                <span className="detail-label">Executada em:</span>
                <span className="detail-value">{formatDate(requisicao.executadoEm)}</span>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>Responsáveis</h3>
            {requisicao.solicitadoPor && (
              <div className="detail-row">
                <span className="detail-label">Solicitado por:</span>
                <span className="detail-value">{requisicao.solicitadoPor}</span>
              </div>
            )}
            {requisicao.aprovadoPor && (
              <div className="detail-row">
                <span className="detail-label">Aprovado por:</span>
                <span className="detail-value">{requisicao.aprovadoPor}</span>
              </div>
            )}
            {requisicao.executadoPor && (
              <div className="detail-row">
                <span className="detail-label">Executado por:</span>
                <span className="detail-value">{requisicao.executadoPor}</span>
              </div>
            )}
          </div>
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
