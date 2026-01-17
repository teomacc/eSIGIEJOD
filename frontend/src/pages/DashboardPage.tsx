import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/client';
import { Link, useNavigate } from 'react-router-dom';
import '@/styles/DashboardPage.css';

/**
 * PÁGINA DASHBOARD - VERSÃO MELHORADA
 * 
 * Layout:
 * - Header com info usuário e igreja
 * - Sidebar com menu de navegação
 * - Cards de indicadores principais
 * - Balanço de fundos (entradas, saídas, saldo)
 * - Alertas importantes
 */

export default function DashboardPage() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get('/dashboard/metrics');
        setData(response.data);
      } catch (err: any) {
        console.error('Erro ao carregar dashboard:', err);
        setError(err.response?.data?.message || 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-card">
          <h2>❌ Erro ao Carregar Dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Tentar Novamente</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-info">
          <h1>Dashboard eSIGIEJOD</h1>
          <div className="header-user">
            <div className="user-details">
              <p className="user-name">👤 {user?.name || user?.email?.split('@')[0]}</p>
              <p className="user-role">
                {user?.roles?.includes('TREASURER') ? 'Tesoureiro' :
                 user?.roles?.includes('DIRECTOR') ? 'Director Financeiro' :
                 user?.roles?.includes('ADMIN') ? 'Administrador' : 'Usuário'}
              </p>
              <p className="user-email">📧 {user?.email}</p>
              <p className="user-church">🏛️ Igreja: IEJOD – Sede Central</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-profile" onClick={() => navigate('/perfil')}>Perfil</button>
          <button className="btn-password" onClick={() => navigate('/alterar-senha')}>Alterar Senha</button>
          {(hasRole('ADMIN') || hasRole('DIRECTOR') || hasRole('TREASURER')) && (
            <button className="btn-register" onClick={() => navigate('/register')}>
              ➕ Registar Usuário
            </button>
          )}
          <button className="btn-logout" onClick={logout}>🚪 Sair</button>
        </div>
      </header>

      {/* INDICADORES PRINCIPAIS */}
      <section className="dashboard-indicators">
          <div className="indicator-card card-success">
            <div className="card-header">
              <h3>📈 Receita Total (Mês Actual)</h3>
            </div>
            <div className="card-body">
              <p className="card-value">
                {data.receita.total.toLocaleString('pt-MZ')} MTn
              </p>
              <p className={`card-variation ${data.receita.variacao >= 0 ? 'positive' : 'negative'}`}>
                {data.receita.variacao >= 0 ? '⬆️ +' : '⬇️ '}{Math.abs(data.receita.variacao)}% em relação ao mês anterior
              </p>
            </div>
          </div>

          <div className="indicator-card card-warning">
            <div className="card-header">
              <h3>🧾 Despesas do Mês</h3>
            </div>
            <div className="card-body">
              <p className="card-value">
                {data.despesas.total.toLocaleString('pt-MZ')} MTn
              </p>
              <p className={`card-variation ${data.despesas.variacao >= 0 ? 'positive' : 'negative'}`}>
                {data.despesas.variacao >= 0 ? '⬆️ +' : '⬇️ '}{Math.abs(data.despesas.variacao)}% comparado ao mês anterior
              </p>
            </div>
          </div>

          <div className="indicator-card card-pending">
            <div className="card-header">
              <h3>⏳ Requisições Pendentes</h3>
            </div>
            <div className="card-body">
              <p className="card-value">{data.requisicoes.total}</p>
              <p className="card-details">
                <span className="badge badge-urgent">🔴 {data.requisicoes.urgentes} urgentes</span>
                <span className="badge badge-normal">🟡 {data.requisicoes.normais} normais</span>
              </p>
            </div>
          </div>

          <div className="indicator-card card-info">
            <div className="card-header">
              <h3>🏦 Fundos Activos</h3>
            </div>
            <div className="card-body">
              <p className="card-value">{data.fundos.ativos} Fundos</p>
              <div className="card-list">
                {data.fundos.balanco.map((fundo: any) => (
                  <span key={fundo.id} className="fund-badge">{fundo.nome}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* BALANÇO FINANCEIRO */}
        <section className="dashboard-balance">
          <h2>🏦 Balanço de Fundos</h2>
          <div className="balance-table-container">
            <table className="balance-table">
              <thead>
                <tr>
                  <th>Fundo</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Saldo Actual</th>
                </tr>
              </thead>
              <tbody>
                {data.fundos.balanco.map((fundo: any) => (
                  <tr key={fundo.id}>
                    <td className="fund-name">{fundo.nome}</td>
                    <td className="fund-income">
                      {fundo.entradas.toLocaleString('pt-MZ')} MTn
                    </td>
                    <td className="fund-expense">
                      {fundo.saidas.toLocaleString('pt-MZ')} MTn
                    </td>
                    <td className="fund-balance">
                      {fundo.saldo.toLocaleString('pt-MZ')} MTn
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ALERTAS IMPORTANTES */}
        {data.alertas && data.alertas.length > 0 && (
          <section className="dashboard-alerts">
            <h2>⚠️ Alertas Importantes</h2>
            <div className="alerts-container">
              {data.alertas.map((alerta: any, index: number) => (
                <div key={index} className={`alert alert-${alerta.tipo}`}>
                  <span className="alert-icon">⚠️</span>
                  <p className="alert-message">{alerta.mensagem}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </>
  );
}
