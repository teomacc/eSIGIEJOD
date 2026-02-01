import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import '@/styles/AuditPage.css';

interface AuditLog {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName?: string;
  entityType?: string;
  entityId?: string;
  changes?: any;
  metadata?: any;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadAuditLogs();
  }, [limit, offset, filterAction, filterUserId]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      if (filterAction) params.append('action', filterAction);
      if (filterUserId) params.append('userId', filterUserId);

      const response = await apiClient.get(`/audit/logs?${params.toString()}`);
      
      if (Array.isArray(response.data)) {
        setLogs(response.data);
      } else if (response.data?.logs) {
        setLogs(response.data.logs);
        setTotalCount(response.data.total);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar logs de auditoria');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      'INCOME_RECORDED': '💰 Receita Registada',
      'REVENUE_RECORDED': '📊 Rendimento Registado',
      'REQUISITION_CREATED': '📝 Requisição Criada',
      'REQUISITION_APPROVED': '✅ Requisição Aprovada',
      'REQUISITION_REJECTED': '❌ Requisição Rejeitada',
      'REQUISITION_EXECUTED': '🚀 Requisição Executada',
      'REQUISITION_CANCELLED': '🚫 Requisição Cancelada',
      'FUND_UPDATED': '🏦 Fundo Actualizado',
      'USER_LOGIN': '🔐 Login do Utilizador',
      'USER_LOGOUT': '🔓 Logout do Utilizador',
      'USER_CREATED': '👤 Utilizador Criado',
      'CHURCH_CREATED': '🏛️ Igreja Criada',
      'CHURCH_UPDATED': '📝 Igreja Actualizada',
      'SETTINGS_CHANGED': '⚙️ Configurações Alteradas',
      'ELEMENT_CLICKED': '🖱️ Clique em Elemento',
      'FORM_SUBMITTED': '📋 Formulário Submetido',
      'PAGE_NAVIGATION': '🗺️ Navegação de Página',
      'USER_TYPING': '⌨️ Digitação',
      'MOUSE_MOVEMENT': '🐭 Movimento de Mouse',
      'PAGE_SCROLLED': '📜 Scroll da Página',
      'ERROR_OCCURRED': '⚠️ Erro Ocorreu',
      'PAGE_HIDDEN': '👁️ Página Oculta',
      'PAGE_VISIBLE': '👁️ Página Visível',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED') || action.includes('CREATED')) return '#28a745';
    if (action.includes('REJECTED') || action.includes('CANCELLED')) return '#dc3545';
    if (action.includes('LOGIN')) return '#007bff';
    if (action.includes('LOGOUT')) return '#6c757d';
    return '#17a2b8';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="audit-page">
        <h1>🕵️ Auditoria</h1>
        <div className="loading-state">Carregando logs de auditoria...</div>
      </div>
    );
  }

  return (
    <div className="audit-page">
      <h1>🕵️ Auditoria - Todos os Eventos</h1>
      <p className="subtitle">
        Visualize cada ação realizada no sistema, desde cliques até operações de negócio
      </p>

      {error && <div className="alert alert-error">❌ {error}</div>}

      {/* Filtros */}
      <div className="audit-filters">
        <div className="filter-group">
          <label>Filtrar por Ação:</label>
          <input
            type="text"
            placeholder="ex: REQUISITION, LOGIN, BUTTON..."
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setOffset(0);
            }}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>Filtrar por Utilizador:</label>
          <input
            type="text"
            placeholder="ex: nome@email.com"
            value={filterUserId}
            onChange={(e) => {
              setFilterUserId(e.target.value);
              setOffset(0);
            }}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>Resultados por página:</label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setOffset(0);
            }}
            className="filter-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <button className="btn-primary" onClick={loadAuditLogs}>
          🔄 Recarregar
        </button>
      </div>

      {/* Tabela de Logs */}
      <div className="audit-table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Ação</th>
              <th>Utilizador</th>
              <th>Descrição</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  Nenhum log encontrado com esses filtros
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="audit-row">
                  <td className="date-cell">
                    {new Date(log.createdAt).toLocaleString('pt-MZ')}
                  </td>
                  <td>
                    <span
                      className="action-badge"
                      style={{
                        backgroundColor: getActionColor(log.action),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="user-cell">
                    <strong>{log.userName || log.userId}</strong>
                  </td>
                  <td className="description-cell">
                    {log.description}
                  </td>
                  <td className="details-cell">
                    {log.changes ? (
                      <details>
                        <summary>📋 Dados</summary>
                        <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                      </details>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalCount > 0 && (
        <div className="pagination">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            className="btn-secondary"
          >
            ← Anterior
          </button>
          <span className="pagination-info">
            Mostrando {offset + 1} a {Math.min(offset + limit, totalCount)} de {totalCount}
          </span>
          <button
            disabled={offset + limit >= totalCount}
            onClick={() => setOffset(offset + limit)}
            className="btn-secondary"
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Legenda de Cores */}
      <div className="audit-legend">
        <h3>Legenda de Acções</h3>
        <div className="legend-items">
          <div className="legend-item" style={{ borderLeftColor: '#28a745' }}>
            <strong>Verde:</strong> Acções bem-sucedidas
          </div>
          <div className="legend-item" style={{ borderLeftColor: '#dc3545' }}>
            <strong>Vermelho:</strong> Acções rejeitadas/canceladas
          </div>
          <div className="legend-item" style={{ borderLeftColor: '#007bff' }}>
            <strong>Azul:</strong> Autenticação
          </div>
          <div className="legend-item" style={{ borderLeftColor: '#17a2b8' }}>
            <strong>Ciano:</strong> Interacção do utilizador
          </div>
        </div>
      </div>
    </div>
  );
}
