import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
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

  useEffect(() => {
    // Mock data - TODO: substituir por API real
    setData({
      receitaMes: 250000,
      receitaVariacao: 12, // percentagem
      despesasMes: 180000,
      despesasVariacao: -5,
      requisiçõesPendentes: 5,
      requisiçõesUrgentes: 2,
      fundosActivos: 2,
      fundos: [
        { 
          nome: 'GERAL', 
          entradas: 800000, 
          saidas: 300000, 
          saldo: 500000 
        },
        { 
          nome: 'CONSTRUÇÃO', 
          entradas: 200000, 
          saidas: 50000, 
          saldo: 150000 
        },
      ],
      alertas: [
        { tipo: 'warning', mensagem: 'Fundo CONSTRUÇÃO abaixo de 200 000 MTn' },
        { tipo: 'warning', mensagem: '2 Requisições aguardam aprovação há mais de 7 dias' },
      ]
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <h2>eSIGIEJOD</h2>
          <p>Sistema de Gestão Financeira</p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className="nav-item active">
            <span className="nav-icon">📊</span>
            Dashboard
          </Link>
          <Link to="/receitas" className="nav-item">
            <span className="nav-icon">💰</span>
            Receitas
          </Link>
          <Link to="/despesas" className="nav-item">
            <span className="nav-icon">🧾</span>
            Despesas
          </Link>
          <Link to="/requisitions" className="nav-item">
            <span className="nav-icon">📝</span>
            Requisições
          </Link>
          <Link to="/aprovacoes" className="nav-item">
            <span className="nav-icon">✅</span>
            Aprovações
          </Link>
          <Link to="/fundos" className="nav-item">
            <span className="nav-icon">🏦</span>
            Fundos
          </Link>
          <Link to="/reports" className="nav-item">
            <span className="nav-icon">📑</span>
            Relatórios
          </Link>
          <Link to="/audit" className="nav-item">
            <span className="nav-icon">🕵🏽</span>
            Auditoria
          </Link>
          <Link to="/configuracoes" className="nav-item">
            <span className="nav-icon">⚙️</span>
            Configurações
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
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
                {data.receitaMes.toLocaleString('pt-MZ')} MTn
              </p>
              <p className="card-variation positive">
                ⬆️ +{data.receitaVariacao}% em relação ao mês anterior
              </p>
            </div>
          </div>

          <div className="indicator-card card-warning">
            <div className="card-header">
              <h3>🧾 Despesas do Mês</h3>
            </div>
            <div className="card-body">
              <p className="card-value">
                {data.despesasMes.toLocaleString('pt-MZ')} MTn
              </p>
              <p className="card-variation negative">
                ⬇️ {data.despesasVariacao}% comparado ao mês anterior
              </p>
            </div>
          </div>

          <div className="indicator-card card-pending">
            <div className="card-header">
              <h3>⏳ Requisições Pendentes</h3>
            </div>
            <div className="card-body">
              <p className="card-value">{data.requisiçõesPendentes}</p>
              <p className="card-details">
                <span className="badge badge-urgent">🔴 {data.requisiçõesUrgentes} urgentes</span>
                <span className="badge badge-normal">🟡 {data.requisiçõesPendentes - data.requisiçõesUrgentes} normais</span>
              </p>
            </div>
          </div>

          <div className="indicator-card card-info">
            <div className="card-header">
              <h3>🏦 Fundos Activos</h3>
            </div>
            <div className="card-body">
              <p className="card-value">{data.fundosActivos} Fundos</p>
              <div className="card-list">
                {data.fundos.map((fundo: any) => (
                  <span key={fundo.nome} className="fund-badge">{fundo.nome}</span>
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
                {data.fundos.map((fundo: any) => (
                  <tr key={fundo.nome}>
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
      </main>
    </div>
  );
}
