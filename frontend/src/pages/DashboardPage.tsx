import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import '@/styles/DashboardPage.css';

/**
 * PÁGINA DASHBOARD (DashboardPage)
 * 
 * Responsabilidade: Visão geral da aplicação
 * 
 * Componentes:
 * - Header com info do usuário
 * - Menu de navegação
 * - Cards com métricas principais
 * - Requisições pendentes
 * - Transações recentes
 * 
 * Dados Exibidos:
 * - Total de receita (mês)
 * - Requisições pendentes
 * - Balanço de fundos
 * - Atividade recente
 * 
 * Fluxo:
 * 1. Componente monta
 * 2. useEffect busca dados da API
 * 3. Renderiza métricas
 * 4. Usuário pode navegar para outras páginas
 * 
 * TODO:
 * - Buscar dados reais da API
 * - Atualizar métricas periodicamente
 * - Gráficos de tendências
 * - Notificações
 */

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Buscar dados do dashboard
    // const fetchData = async () => {
    //   try {
    //     const monthlyReport = await api.reports.getMonthlyReport(
    //       new Date().getFullYear(),
    //       new Date().getMonth() + 1
    //     );
    //     const pendingReqs = await api.requisitions.getPending();
    //     setData({ monthlyReport, pendingReqs });
    //   } catch (err) {
    //     console.error('Erro ao buscar dados:', err);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchData();

    // Por enquanto, mock data
    setData({
      totalIncome: 250000,
      pendingRequisitions: 5,
      funds: [
        { name: 'GERAL', balance: 500000 },
        { name: 'CONSTRUÇÃO', balance: 150000 },
      ],
    });
    setLoading(false);
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-info">
          <h1>Dashboard eSIGIEJOD</h1>
          <p>Bem-vindo, {user?.email}</p>
        </div>
        <button className="dashboard-logout-button" onClick={logout}>
          Sair
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="dashboard-nav">
        <Link to="/">Dashboard</Link>
        <Link to="/requisitions">Requisições</Link>
        <Link to="/audit">Auditoria</Link>
        <Link to="/reports">Relatórios</Link>
      </nav>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card metric-card-success">
          <h3>Total Receita (Mês)</h3>
          <p>
            {data?.totalIncome?.toLocaleString('pt-MZ', {
              style: 'currency',
              currency: 'MZN'
            })}
          </p>
        </div>

        <div className="metric-card metric-card-warning">
          <h3>Requisições Pendentes</h3>
          <p>{data?.pendingRequisitions}</p>
        </div>

        <div className="metric-card metric-card-info">
          <h3>Fundos Ativos</h3>
          <p>{data?.funds?.length}</p>
        </div>
      </div>

      {/* Funds Summary */}
      <div className="funds-section">
        <h2>Balanço de Fundos</h2>
        <table className="funds-table">
          <thead>
            <tr>
              <th>Fundo</th>
              <th>Balanço</th>
            </tr>
          </thead>
          <tbody>
            {data?.funds?.map((fund: any) => (
              <tr key={fund.name}>
                <td>{fund.name}</td>
                <td>
                  {fund.balance.toLocaleString('pt-MZ', {
                    style: 'currency',
                    currency: 'MZN'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>Estado do Projeto</h4>
        <ul>
          <li>✅ Backend API - Em desenvolvimento (NestJS)</li>
          <li>✅ Frontend Base - Em desenvolvimento (React)</li>
          <li>⏳ Integração com APIs - A fazer</li>
          <li>⏳ Testes - A fazer</li>
          <li>⏳ Deploy - A fazer</li>
        </ul>
      </div>
    </div>
  );
}
