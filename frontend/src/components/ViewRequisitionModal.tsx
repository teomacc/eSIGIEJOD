import React, { useEffect, useState } from 'react';
import '@/styles/ViewRequisitionModal.css';

interface ViewRequisitionModalProps {
  requisitionId: string;
  onClose: () => void;
}

interface RequisitionDetails {
  id: string;
  code?: string;
  category: string;
  requestedAmount: number;
  approvedAmount?: number;
  state: string;
  justification: string;
  createdAt: string;
  requestedAt?: string;
  executedAt?: string;
  creatorType?: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedByLevel2?: string;
  approvedByLevel3?: string;
  motivoRejeicao?: string;
  attachments?: string;
  churchId?: string;
  fundId?: string;
  creatorInfo?: {
    userId: string;
    name: string;
    email: string;
  };
  churchInfo?: {
    churchId: string;
    name: string;
    code?: string;
  };
  approvers?: Array<{
    level: number;
    userId: string;
    name: string;
    email: string;
  }>;
}

const ViewRequisitionModal: React.FC<ViewRequisitionModalProps> = ({ requisitionId, onClose }) => {
  const [data, setData] = useState<RequisitionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequisition();
  }, [requisitionId]);

  const loadRequisition = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar requisição');
      }
      
      const result = await response.json();
      setData(result);
    } catch (e: any) {
      console.error(e);
      setError('Erro ao carregar detalhes da requisição');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | undefined) =>
    Number.isFinite(value) ? Number(value).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' }) : '--';

  const formatDate = (value?: string) => {
    if (!value) return '--';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '--' : d.toLocaleString('pt-MZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (state: string) => {
    const classes: Record<string, string> = {
      APROVADA: 'status-approved',
      EM_ANALISE: 'status-under-review',
      PENDENTE: 'status-pending',
      EXECUTADA: 'status-executed',
      REJEITADA: 'status-rejected',
      CANCELADA: 'status-cancelled',
    };
    return classes[state] || 'status-default';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // TODO: Implementar geração de PDF
    alert('Funcionalidade de download PDF será implementada em breve');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content view-requisition-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Detalhes da Requisição</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="modal-loading">Carregando...</div>}
        {error && <div className="modal-error">{error}</div>}

        {data && (
          <div className="modal-body">
            {/* Cabeçalho */}
            <div className="requisition-header">
              <div className="header-item">
                <label>Código:</label>
                <span className="code-badge">{data.code || '—'}</span>
              </div>
              <div className="header-item">
                <label>Estado:</label>
                <span className={`status-badge ${getStatusBadgeClass(data.state)}`}>
                  {data.state}
                </span>
              </div>
            </div>

            {/* Informações do Criador e Igreja */}
            <div className="details-section">
              <h3>👤 Criador da Requisição</h3>
              <div className="info-card">
                <div className="info-row">
                  <strong>Nome:</strong>
                  <span>{data.creatorInfo?.name || 'Não disponível'}</span>
                </div>
                <div className="info-row">
                  <strong>Email:</strong>
                  <span>{data.creatorInfo?.email || '—'}</span>
                </div>
                <div className="info-row">
                  <strong>Igreja:</strong>
                  <span>
                    {data.churchInfo?.name || 'Não disponível'}
                    {data.churchInfo?.code && ` (${data.churchInfo.code})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações Financeiras */}
            <div className="details-section">
              <h3>💰 Informações Financeiras</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Categoria:</label>
                  <span>{data.category}</span>
                </div>
                <div className="detail-item">
                  <label>Tipo de Criador:</label>
                  <span>{data.creatorType || 'Não especificado'}</span>
                </div>
                <div className="detail-item">
                  <label>Valor Solicitado:</label>
                  <span className="amount">{formatCurrency(data.requestedAmount)}</span>
                </div>
                <div className="detail-item">
                  <label>Valor Aprovado:</label>
                  <span className="amount">
                    {data.approvedAmount ? formatCurrency(data.approvedAmount) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Justificação */}
            <div className="details-section">
              <h3>📝 Justificação</h3>
              <p className="justification">{data.justification}</p>
            </div>

            {/* Rejeição (se aplicável) */}
            {data.state === 'REJEITADA' && data.motivoRejeicao && (
              <div className="details-section rejection-section">
                <h3>❌ Motivo da Rejeição</h3>
                <p className="rejection-reason">{data.motivoRejeicao}</p>
              </div>
            )}

            {/* Datas */}
            <div className="details-section">
              <h3>📅 Cronologia</h3>
              <div className="timeline">
                <div className="timeline-item">
                  <span className="timeline-label">Criada em:</span>
                  <span className="timeline-value">{formatDate(data.createdAt)}</span>
                </div>
                {data.requestedAt && (
                  <div className="timeline-item">
                    <span className="timeline-label">Enviada para análise em:</span>
                    <span className="timeline-value">{formatDate(data.requestedAt)}</span>
                  </div>
                )}
                {data.executedAt && (
                  <div className="timeline-item">
                    <span className="timeline-label">Executada em:</span>
                    <span className="timeline-value">{formatDate(data.executedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Aprovadores */}
            {data.approvers && data.approvers.length > 0 && (
              <div className="details-section">
                <h3>✅ Histórico de Aprovações</h3>
                <div className="approvers-list">
                  {data.approvers.map((approver) => (
                    <div key={approver.level} className="approver-item">
                      <span className="level">Nível {approver.level}:</span>
                      <div className="approver-details">
                        <span className="approver-name">{approver.name}</span>
                        <span className="approver-email">{approver.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anexos */}
            {data.attachments && (
              <div className="details-section">
                <h3>📎 Anexos</h3>
                <div className="attachments-list">
                  {JSON.parse(data.attachments).map((url: string, idx: number) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="attachment-link">
                      📄 Anexo {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Fechar</button>
          <button className="btn-print" onClick={handlePrint}>🖨️ Imprimir</button>
          <button className="btn-download" onClick={handleDownloadPDF}>📥 Baixar PDF</button>
        </div>
      </div>
    </div>
  );
};

export default ViewRequisitionModal;
