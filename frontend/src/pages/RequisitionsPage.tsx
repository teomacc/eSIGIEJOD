import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import CreateRequisitionModal from '@/components/CreateRequisitionModal';
import ApproveRequisitionModal from '@/components/ApproveRequisitionModal';
import ExecuteRequisitionModal from '@/components/ExecuteRequisitionModal';
import '@/styles/RequisitionsPage.css';

type StatusKey = 'all' | 'pending' | 'under-review' | 'approved' | 'executed';

interface RequisitionRow {
  id: string;
  code?: string;
  category: string;
  requestedAmount: number;
  approvedAmount?: number;
  state: string;
  justification: string;
  createdAt?: string;
  requestedAt?: string;
  fundId?: string;
}

const STATUS_TABS: Array<{ key: StatusKey; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'under-review', label: 'Em Análise' },
  { key: 'approved', label: 'Aprovadas' },
  { key: 'executed', label: 'Executadas' },
];

const STATUS_KEY_TO_STATE: Record<Exclude<StatusKey, 'all'>, string> = {
  'pending': 'PENDENTE',
  'under-review': 'EM_ANALISE',
  'approved': 'APROVADA',
  'executed': 'EXECUTADA',
};

const formatCurrency = (value: number | undefined) =>
  Number.isFinite(value) ? Number(value).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' }) : '--';

const formatDate = (value?: string) => {
  if (!value) return '--';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '--' : d.toLocaleDateString('pt-MZ');
};

export default function RequisitionsPage() {
  const [status, setStatus] = useState<StatusKey>('all');
  const [data, setData] = useState<RequisitionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approveModal, setApproveModal] = useState<{
    requisitionId: string;
    requestedAmount: number;
    originalFundId?: string;
    isLevel2: boolean;
  } | null>(null);
  const [executeModal, setExecuteModal] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = search
        ? (item.code || '').toLowerCase().includes(search.toLowerCase()) ||
          item.justification.toLowerCase().includes(search.toLowerCase())
        : true;
      const minOk = minAmount ? item.requestedAmount >= Number(minAmount) : true;
      const maxOk = maxAmount ? item.requestedAmount <= Number(maxAmount) : true;
      return matchesSearch && minOk && maxOk;
    });
  }, [data, search, minAmount, maxAmount]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((item) => {
      counts[item.state] = (counts[item.state] || 0) + 1;
    });
    return counts;
  }, [data]);

  const loadData = async (current: StatusKey) => {
    setLoading(true);
    setError(null);
    try {
      if (current === 'all') {
        const res = await api.requisitions.list();
        setData(res.data);
      } else {
        const res = await api.requisitions.listByStatus(current);
        setData(res.data);
      }
    } catch (e: any) {
      console.error(e);
      setError('Erro ao carregar requisições');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(status);
  }, [status]);

  const handleApprove = (requisition: RequisitionRow, level2: boolean = false) => {
    setApproveModal({
      requisitionId: requisition.id,
      requestedAmount: requisition.requestedAmount,
      originalFundId: requisition.fundId,
      isLevel2: level2,
    });
  };

  const handleSubmitForReview = async (id: string) => {
    try {
      await api.requisitions.submit(id);
      loadData(status);
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar para análise');
    }
  };

  const handleReject = async (id: string) => {
    const motivo = window.prompt('Motivo da rejeição?');
    if (!motivo) return;
    try {
      await api.requisitions.reject(id, motivo);
      loadData(status);
    } catch (e) {
      console.error(e);
      alert('Erro ao rejeitar');
    }
  };

  const handleExecute = (id: string) => {
    setExecuteModal(id);
  };

  const statusBadgeClass = (state: string) => {
    if (state === 'APROVADA') return 'status-badge status-approved';
    if (state === 'EM_ANALISE') return 'status-badge status-under-review';
    if (state === 'PENDENTE') return 'status-badge status-pending';
    if (state === 'EXECUTADA') return 'status-badge status-executed';
    if (state === 'REJEITADA') return 'status-badge status-rejected';
    return 'status-badge';
  };

  return (
    <div className="requisitions-page">
      <div className="page-header">
        <div>
          <h1>Requisições de Despesa</h1>
          <p>Gestão e acompanhamento de requisições financeiras</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Nova Requisição
          </button>
          <button className="ghost" onClick={() => loadData(status)} disabled={loading}>
            Recarregar
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Buscar por código ou motivo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="number"
          placeholder="Valor mín"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
        />
        <input
          type="number"
          placeholder="Valor máx"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
        />
      </div>

      <div className="status-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${status === tab.key ? 'active' : ''}`}
            onClick={() => setStatus(tab.key)}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="pill">{summary[STATUS_KEY_TO_STATE[tab.key as Exclude<StatusKey, 'all'>]] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <table className="requisitions-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Categoria</th>
              <th>Solicitado</th>
              <th>Estado</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-cell">Nenhuma requisição encontrada</td>
              </tr>
            )}
            {filtered.map((req) => (
              <tr key={req.id}>
                <td>{req.code || '—'}</td>
                <td>{req.category}</td>
                <td>{formatCurrency(req.requestedAmount)}</td>
                <td>
                  <span className={statusBadgeClass(req.state)}>{req.state}</span>
                </td>
                <td>{formatDate(req.requestedAt || req.createdAt)}</td>
                <td className="actions">
                  {req.state === 'PENDENTE' && (
                    <button className="btn-submit" onClick={() => handleSubmitForReview(req.id)}>Enviar para análise</button>
                  )}
                  {req.state === 'EM_ANALISE' && (
                    <>
                      <button className="btn-approve" onClick={() => handleApprove(req, false)}>✓ Aprovar</button>
                      <button className="btn-approve-level2" onClick={() => handleApprove(req, true)}>→ Aprovar N2</button>
                      <button className="btn-reject" onClick={() => handleReject(req.id)}>✕ Rejeitar</button>
                    </>
                  )}
                  {req.state === 'APROVADA' && (
                    <button className="btn-execute" onClick={() => handleExecute(req.id)}>Executar</button>
                  )}
                  {['REJEITADA', 'EXECUTADA'].includes(req.state) && (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreateModal && (
        <CreateRequisitionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => loadData(status)}
        />
      )}

      {approveModal && (
        <ApproveRequisitionModal
          requisitionId={approveModal.requisitionId}
          requestedAmount={approveModal.requestedAmount}
          originalFundId={approveModal.originalFundId}
          isLevel2={approveModal.isLevel2}
          onClose={() => setApproveModal(null)}
          onSuccess={() => {
            setApproveModal(null);
            loadData(status);
          }}
        />
      )}

      {executeModal && (
        <ExecuteRequisitionModal
          requisitionId={executeModal}
          onClose={() => setExecuteModal(null)}
          onSuccess={() => {
            setExecuteModal(null);
            loadData(status);
          }}
        />
      )}

      <div className="info-box">
        <h4>Ciclo de Vida</h4>
        <p>PENDENTE → EM_ANALISE → APROVADA → EXECUTADA ou REJEITADA/CANCELADA</p>
      </div>
    </div>
  );
}
