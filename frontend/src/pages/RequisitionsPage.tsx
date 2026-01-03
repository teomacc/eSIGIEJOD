import React from 'react';
import { Link } from 'react-router-dom';
import '@/styles/RequisitionsPage.css';

/**
 * PÁGINA DE REQUISIÇÕES (RequisitionsPage)
 * 
 * Responsabilidade: Listar, criar, e gerenciar requisições
 * 
 * Funcionalidades:
 * - Listar requisições (com filtro por estado)
 * - Criar nova requisição
 * - Aprovar/Rejeitar requisições
 * - Visualizar detalhes
 * 
 * Estados de Requisição:
 * - PENDING: Criada, aguardando submissão
 * - UNDER_REVIEW: Enviada, aguardando aprovação
 * - APPROVED: Aprovada, pronta para executar
 * - REJECTED: Rejeitada
 * - EXECUTED: Já foi executada
 * - CANCELLED: Cancelada
 * 
 * TODO:
 * - Buscar dados reais da API
 * - Formulário de criação
 * - Filtros por estado/categoria
 * - Paginação
 */

export default function RequisitionsPage() {
  return (
    <div style={{ padding: '20px' }}>
      <div className="page-header">
        <Link to="/">← Voltar</Link>
      </div>

      <h1>Requisições de Despesa</h1>

      <div className="requisitions-header">
        <input
          type="text"
          placeholder="Buscar requisição..."
          className="requisitions-search"
        />
        <button className="new-requisition-button">
          + Nova Requisição
        </button>
      </div>

      {/* Tabs de Estados */}
      <div className="tabs">
        {['Todas', 'Pendentes', 'Em Revisão', 'Aprovadas', 'Rejeitadas'].map((tab) => (
          <button
            key={tab}
            className={`tab-button ${tab === 'Todas' ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table de Requisições */}
      <table className="requisitions-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Categoria</th>
            <th>Valor</th>
            <th>Estado</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {/* Mock data - substituir com dados reais da API */}
          <tr>
            <td>REQ-2024-001</td>
            <td>MATERIALS</td>
            <td>15.000 MT</td>
            <td>
              <span className="status-badge status-under-review">
                UNDER_REVIEW
              </span>
            </td>
            <td>15/01/2024</td>
            <td>
              <button className="view-button">Ver</button>
            </td>
          </tr>
          <tr>
            <td>REQ-2024-002</td>
            <td>PERSONNEL</td>
            <td>45.000 MT</td>
            <td>
              <span className="status-badge status-approved">APPROVED</span>
            </td>
            <td>14/01/2024</td>
            <td>
              <button className="view-button">Ver</button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Empty State */}
      <div className="empty-state">
        <p>Nenhuma requisição encontrada</p>
        <p>Crie uma requisição para começar</p>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>Ciclo de Vida de Requisição</h4>
        <p>
          PENDING → UNDER_REVIEW → APPROVED → EXECUTED
          <br/>
          ou REJECTED ou CANCELLED em qualquer fase
        </p>
      </div>
    </div>
  );
}
