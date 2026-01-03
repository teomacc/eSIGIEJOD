import React from 'react';
import { Link } from 'react-router-dom';
import '@/styles/ReportsPage.css';

/**
 * PÁGINA DE RELATÓRIOS (ReportsPage)
 * 
 * Responsabilidade: Geração e visualização de relatórios
 * 
 * Tipos de Relatório:
 * 1. Relatório Mensal
 *    - Total de receita do mês
 *    - Receita por tipo (Dízimo, Oferta, etc)
 *    - Receita por fundo
 *    - Requisições do mês
 * 
 * 2. Relatório Geral
 *    - Período customizável
 *    - Agregação de dados
 * 
 * 3. Relatório de Fundo
 *    - Análise de fundo específico
 *    - Histórico de entradas
 *    - Balanço atual
 * 
 * 4. Relatório de Requisições
 *    - Requisições por estado
 *    - Requisições por categoria
 *    - Tempo de aprovação
 * 
 * 5. Relatório de Compliance
 *    - Atividade por período
 *    - Ações por usuário
 *    - Rastreamento de mudanças
 * 
 * 6. Detecção de Anomalias
 *    - Transações incomuns
 *    - Padrões suspeitos
 * 
 * TODO:
 * - Integrar com API
 * - Gráficos (Chart.js, Recharts)
 * - Exportar para PDF/Excel
 * - Agendamento de relatórios
 */

export default function ReportsPage() {
  return (
    <div style={{ padding: '20px' }}>
      <div className="page-header">
        <Link to="/">← Voltar</Link>
      </div>

      <h1>Relatórios</h1>

      {/* Report Cards */}
      <div className="report-cards-container">
        {/* Monthly Report */}
        <div className="report-card">
          <h3>📊 Relatório Mensal</h3>
          <p>Receita, despesas e atividades do mês</p>
          <button className="generate-button-primary">Gerar</button>
        </div>

        {/* General Report */}
        <div className="report-card">
          <h3>📈 Relatório Geral</h3>
          <p>Período customizável (trimestre, semestre, ano)</p>
          <div className="date-range-inputs">
            <input type="date" className="date-input" />
            <input type="date" className="date-input" />
          </div>
          <button className="generate-button-success">Gerar</button>
        </div>

        {/* Fund Report */}
        <div className="report-card">
          <h3>💰 Relatório de Fundo</h3>
          <p>Análise detalhada de fundo específico</p>
          <select className="fund-select">
            <option>Selecionar fundo...</option>
            <option>GERAL</option>
            <option>CONSTRUÇÃO</option>
            <option>MISSÕES</option>
          </select>
          <button className="generate-button-warning">Gerar</button>
        </div>

        {/* Requisitions Report */}
        <div className="report-card">
          <h3>📋 Relatório de Requisições</h3>
          <p>Análise de requisições por estado e categoria</p>
          <button className="generate-button-info">Gerar</button>
        </div>

        {/* Compliance Report */}
        <div className="report-card">
          <h3>🔒 Relatório de Compliance</h3>
          <p>Auditoria de atividades e conformidade</p>
          <button className="generate-button-danger">Gerar</button>
        </div>

        {/* Anomaly Detection */}
        <div className="report-card">
          <h3>⚠️ Detecção de Anomalias</h3>
          <p>Identificar padrões anormais ou suspeitos</p>
          <button className="generate-button-secondary">Analisar</button>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="recent-reports-section">
        <h2>Relatórios Recentes</h2>
        <table className="reports-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Período</th>
              <th>Data de Geração</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Relatório Mensal</td>
              <td>Janeiro/2024</td>
              <td>15/01/2024 14:30</td>
              <td>
                <button className="report-action-button">Ver</button>
                <button className="report-action-button">Download</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>Recursos Futuros</h4>
        <ul>
          <li>📊 Gráficos interativos (linha, pizza, barra)</li>
          <li>📥 Exportar para PDF, Excel, CSV</li>
          <li>📅 Agendamento de relatórios (semanal, mensal)</li>
          <li>📧 Email automático de relatórios</li>
          <li>🤖 Machine Learning para detecção de anomalias</li>
          <li>📱 Versão mobile dos relatórios</li>
        </ul>
      </div>
    </div>
  );
}
