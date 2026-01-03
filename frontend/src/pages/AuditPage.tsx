import React from 'react';
import { Link } from 'react-router-dom';
import '@/styles/AuditPage.css';

/**
 * PÁGINA DE AUDITORIA (AuditPage)
 * 
 * Responsabilidade: Visualizar logs de auditoria
 * 
 * Funcionalidades:
 * - Listar logs de auditoria (todos os eventos)
 * - Filtrar por ação, usuário, entidade, período
 * - Visualizar detalhes de log
 * - Exportar logs
 * 
 * Tipos de Ação:
 * - INCOME_RECORDED: Receita registrada
 * - REQUISITION_CREATED/APPROVED/REJECTED/EXECUTED/CANCELLED
 * - FUND_UPDATED: Fundo atualizado
 * - USER_LOGIN: Usuário fez login
 * - USER_CREATED: Novo usuário criado
 * - SETTINGS_CHANGED: Configurações mudaram
 * - REPORT_GENERATED: Relatório foi gerado
 * 
 * TODO:
 * - Buscar logs reais da API
 * - Filtros avançados
 * - Exportar para CSV/PDF
 * - Gráficos de atividade
 * - Paginação
 */

export default function AuditPage() {
  return (
    <div style={{ padding: '20px' }}>
      <div className="page-header">
        <Link to="/">← Voltar</Link>
      </div>

      <h1>Auditoria</h1>

      {/* Filters */}
      <div className="filters-grid">
        <input
          type="text"
          placeholder="Buscar por ação..."
          className="filter-input"
        />
        <input
          type="text"
          placeholder="Buscar por usuário..."
          className="filter-input"
        />
        <input
          type="date"
          className="filter-date"
        />
        <button className="export-button">Exportar</button>
      </div>

      {/* Logs Table */}
      <table className="audit-table">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Ação</th>
            <th>Usuário</th>
            <th>Entidade</th>
            <th>Descrição</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {/* Mock data - substituir com dados reais da API */}
          <tr>
            <td>15/01/2024 10:30</td>
            <td>
              <span className="action-badge action-approved">
                REQUISITION_APPROVED
              </span>
            </td>
            <td>pastor@church.mz</td>
            <td>REQ-2024-001</td>
            <td>Requisição aprovada. Valor: 15000 MT</td>
            <td>
              <button className="details-button">Ver</button>
            </td>
          </tr>
          <tr>
            <td>15/01/2024 09:15</td>
            <td>
              <span className="action-badge action-recorded">
                INCOME_RECORDED
              </span>
            </td>
            <td>treasurer@church.mz</td>
            <td>INC-2024-001</td>
            <td>Oferta registrada. Valor: 50000 MT</td>
            <td>
              <button className="details-button">Ver</button>
            </td>
          </tr>
          <tr>
            <td>14/01/2024 16:45</td>
            <td>
              <span className="action-badge action-login">
                USER_LOGIN
              </span>
            </td>
            <td>director@church.mz</td>
            <td>USER-001</td>
            <td>Usuário fez login</td>
            <td>
              <button className="details-button">Ver</button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button className="pagination-button">←</button>
        <span className="pagination-info">Página 1 de 10</span>
        <button className="pagination-button">→</button>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>Sobre Auditoria</h4>
        <ul>
          <li>✅ Logs imutáveis (read-only)</li>
          <li>✅ Todos os eventos são rastreados</li>
          <li>✅ Rastreamento de usuário para cada ação</li>
          <li>✅ Compliance com regulamentações</li>
          <li>✅ Detecção de anomalias (futuro)</li>
        </ul>
      </div>
    </div>
  );
}
