import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/client';
import { getRoleLabel, UserRole } from '@/utils/permissions';
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
  const { user, logout, hasRole, activeChurchContext, setActiveChurchContext } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [churches, setChurches] = useState<Array<{ id: string; nome: string; codigo?: string }>>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string>('');
  const [churchLabel, setChurchLabel] = useState<string>('');

    const isObreiro = hasRole(UserRole.OBREIRO);
  const isLiderFinanceiroGeral = hasRole(UserRole.LIDER_FINANCEIRO_GERAL);
  const isGlobalUser = user?.roles?.some((role) =>
    [UserRole.ADMIN, UserRole.LIDER_FINANCEIRO_GERAL].includes(role as UserRole)
  );

  const fetchDashboardData = useCallback(
    async (targetChurchId?: string) => {
      try {
        setLoading(true);
        setError(null);

        // Obreiros usam endpoint diferente (não veem fundos)
        const endpoint = isObreiro ? '/dashboard/obreiro-metrics' : '/dashboard/metrics';
        const response = await apiClient.get(endpoint, {
          params: !isObreiro && targetChurchId ? { churchId: targetChurchId } : {},
        });

        setData(response.data);
      } catch (err: any) {
        console.error('Erro ao carregar dashboard:', err);
        setError(err.response?.data?.message || 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    },
    [isObreiro]
  );

  const loadChurches = useCallback(async () => {
    if (!isGlobalUser) return;
    try {
      const res = await apiClient.get('/churches');
      setChurches(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar igrejas', err);
    }
  }, [isGlobalUser]);

  useEffect(() => {
    loadChurches();
    fetchDashboardData(selectedChurchId || undefined);

    const interval = setInterval(() => {
      fetchDashboardData(selectedChurchId || undefined);
    }, 30000);

    const handleFocus = () => {
      fetchDashboardData(selectedChurchId || undefined);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isGlobalUser, fetchDashboardData, loadChurches, selectedChurchId]);

  const handleChurchChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedChurchId(value);
    setData(null);
    // Recarregar métricas para igreja específica ou visão geral
    fetchDashboardData(value || undefined)
      .then(() => {
        if (value) {
          const found = churches.find((c) => c.id === value);
          setChurchLabel(found ? `${found.nome}${found.codigo ? ` (${found.codigo})` : ''}` : 'Igreja selecionada');
        } else {
          setChurchLabel('Visão Geral - Todas as Igrejas');
        }
      })
      .catch((err) => {
        console.error('Erro ao trocar igreja', err);
        setError('Erro ao carregar dados para a igreja selecionada');
      });
  };

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

    // DASHBOARD ESPECÍFICO PARA OBREIROS
    if (isObreiro && data) {
      return (
        <>
          {/* HEADER */}
          <header className="dashboard-header">
            <div className="header-info">
              <h1>Dashboard eSIGIEJOD - Minhas Requisições</h1>
              <div className="header-user">
                <div className="user-details">
                  <p className="user-name">👤 {user?.nomeCompleto || user?.username || user?.email?.split('@')[0]}</p>
                  <p className="user-role">{user?.roles?.map((r) => getRoleLabel(r)).join(', ')}</p>
                  <p className="user-email">📧 {user?.email || user?.username}</p>
                </div>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn-profile" onClick={() => navigate('/perfil')}>Perfil</button>
              <button className="btn-password" onClick={() => navigate('/alterar-senha')}>Alterar Senha</button>
              <button className="btn-logout" onClick={logout}>🚪 Sair</button>
            </div>
          </header>

          {/* SELETOR DE CONTEXTO - Apenas para LIDER_FINANCEIRO_GERAL */}
          {isLiderFinanceiroGeral && (
            <div className="church-context-selector">
              <p className="context-label">📋 Selecione a Igreja para Operações Financeiras:</p>
              <div className="context-buttons">
                <button
                  className={`context-btn ${activeChurchContext === 'GERAL' ? 'active' : ''}`}
                  onClick={() => setActiveChurchContext('GERAL')}
                >
                  🌍 Conta Geral
                </button>
                <button
                  className={`context-btn ${activeChurchContext !== 'GERAL' ? 'active' : ''}`}
                  onClick={() => setActiveChurchContext(user?.churchId || '')}
                  title={`Operar com fundos da sua igreja local`}
                >
                  📍 {user?.nomeCompleto || 'Minha Igreja'}
                </button>
              </div>
              <p className="context-hint">
                {activeChurchContext === 'GERAL' 
                  ? '💡 Fundos gerais - Operações com a conta geral da organização' 
                  : '💡 Fundos locais - Operações com fundos de sua igreja'}
              </p>
              {activeChurchContext !== user?.churchId && activeChurchContext !== 'GERAL' && (
                <div className="context-warning">
                  ⚠️ Contexto: Verifique se a Igreja selecionada corresponde à requisição que está aprovando
                </div>
              )}
            </div>
          )}

          {/* INDICADORES OBREIRO - APENAS SUAS DESPESAS */}
          <section className="dashboard-indicators">
            <div className="indicator-card card-info">
              <div className="card-header">
                <h3>📊 Total de Requisições</h3>
              </div>
              <div className="card-body">
                <p className="card-value">{data.resumo.totalRequisicoes}</p>
                <p className="card-details">Requisições criadas por mim</p>
              </div>
            </div>

            <div className="indicator-card card-success">
              <div className="card-header">
                <h3>💰 Valor Total Solicitado</h3>
              </div>
              <div className="card-body">
                <p className="card-value">
                  {data.resumo.valorTotalSolicitado.toLocaleString('pt-MZ')} MTn
                </p>
                <p className="card-details">Todas as minhas requisições</p>
              </div>
            </div>

            <div className="indicator-card card-approved">
              <div className="card-header">
                <h3>✅ Valor Total Aprovado</h3>
              </div>
              <div className="card-body">
                <p className="card-value">
                  {data.resumo.valorTotalAprovado.toLocaleString('pt-MZ')} MTn
                </p>
                <p className="card-details">Requisições aprovadas/executadas</p>
              </div>
            </div>

            <div className="indicator-card card-warning">
              <div className="card-header">
                <h3>📅 Requisições do Mês</h3>
              </div>
              <div className="card-body">
                <p className="card-value">{data.mesAtual.requisicoes}</p>
                <p className="card-details">
                  {data.mesAtual.valor.toLocaleString('pt-MZ')} MTn solicitados
                </p>
              </div>
            </div>
          </section>

          {/* STATUS DAS REQUISIÇÕES */}
          <section className="dashboard-balance">
            <h2>📋 Status das Minhas Requisições</h2>
            <div className="balance-table-container">
              <table className="balance-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="fund-name">⏳ Pendentes</td>
                    <td className="fund-balance">{data.porStatus.pendentes}</td>
                  </tr>
                  <tr>
                    <td className="fund-name">🔍 Em Análise</td>
                    <td className="fund-balance">{data.porStatus.emAnalise}</td>
                  </tr>
                  <tr>
                    <td className="fund-name">✅ Aprovadas</td>
                    <td className="fund-balance">{data.porStatus.aprovadas}</td>
                  </tr>
                  <tr>
                    <td className="fund-name">✔️ Executadas</td>
                    <td className="fund-balance">{data.porStatus.executadas}</td>
                  </tr>
                  <tr>
                    <td className="fund-name">❌ Rejeitadas</td>
                    <td className="fund-balance">{data.porStatus.rejeitadas}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ÚLTIMAS REQUISIÇÕES */}
          {data.ultimasRequisicoes && data.ultimasRequisicoes.length > 0 && (
            <section className="dashboard-balance">
              <h2>🕒 Últimas Requisições</h2>
              <div className="balance-table-container">
                <table className="balance-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ultimasRequisicoes.map((req: any) => (
                      <tr key={req.id}>
                        <td className="fund-name">{req.descricao}</td>
                        <td className="fund-income">
                          {req.valor.toLocaleString('pt-MZ')} MTn
                        </td>
                        <td className="fund-balance">
                          {req.estado === 'PENDENTE' && '⏳ Pendente'}
                          {req.estado === 'EM_ANALISE' && '🔍 Em Análise'}
                          {req.estado === 'APROVADA' && '✅ Aprovada'}
                          {req.estado === 'EXECUTADA' && '✔️ Executada'}
                          {req.estado === 'REJEITADA' && '❌ Rejeitada'}
                        </td>
                        <td className="fund-expense">
                          {new Date(req.criadaEm).toLocaleDateString('pt-MZ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ALERTA INFORMATIVO */}
          <section className="dashboard-alerts">
            <div className="alerts-container">
              <div className="alert alert-info">
                <span className="alert-icon">ℹ️</span>
                <p className="alert-message">
                  Como Obreiro, você visualiza apenas suas requisições pessoais. 
                  Para ver mais detalhes, acesse a página de <Link to="/requisicoes">Requisições</Link>.
                </p>
              </div>
            </div>
          </section>
        </>
      );
    }

    // DASHBOARD PADRÃO (para outros roles)
  return (
    <>
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-info">
          <h1>Dashboard eSIGIEJOD</h1>
          <div className="header-user">
            <div className="user-details">
              <p className="user-name">👤 {user?.nomeCompleto || user?.username || user?.email?.split('@')[0]}</p>
              <p className="user-role">{user?.roles?.map((r) => getRoleLabel(r)).join(', ')}</p>
              <p className="user-email">📧 {user?.email || user?.username}</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          {isGlobalUser && (
            <select value={selectedChurchId} onChange={handleChurchChange} className="church-selector" aria-label="Selecionar igreja">
              <option value="">Visão Geral - Todas as Igrejas</option>
              {churches.map((church) => (
                <option key={church.id} value={church.id}>
                  {church.nome}{church.codigo ? ` (${church.codigo})` : ''}
                </option>
              ))}
            </select>
          )}
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

      {/* SELETOR DE CONTEXTO - Apenas para LIDER_FINANCEIRO_GERAL */}
      {isLiderFinanceiroGeral && (
        <div className="church-context-selector">
          <p className="context-label">📋 Selecione a Igreja para Operações Financeiras:</p>
          <div className="context-buttons">
            <button
              className={`context-btn ${activeChurchContext === 'GERAL' ? 'active' : ''}`}
              onClick={() => setActiveChurchContext('GERAL')}
            >
              🌍 Conta Geral
            </button>
            <button
              className={`context-btn ${activeChurchContext !== 'GERAL' ? 'active' : ''}`}
              onClick={() => setActiveChurchContext(user?.churchId || '')}
              title={`Operar com fundos da sua igreja local`}
            >
              📍 {user?.nomeCompleto || 'Minha Igreja'}
            </button>
          </div>
          <p className="context-hint">
            {activeChurchContext === 'GERAL' 
              ? '💡 Fundos gerais - Operações com a conta geral da organização' 
              : '💡 Fundos locais - Operações com fundos de sua igreja'}
          </p>
          {activeChurchContext !== user?.churchId && activeChurchContext !== 'GERAL' && (
            <div className="context-warning">
              ⚠️ Contexto: Verifique se a Igreja selecionada corresponde à requisição que está aprovando
            </div>
          )}
        </div>
      )}

      {/* INDICADORES PRINCIPAIS */}
      <section className="dashboard-indicators">
          <div className="indicator-card card-success">
            <div className="card-header">
              <h3>📈 Receita Total (Mês Actual)</h3>
            </div>
            <div className="card-body">
              <p className="card-value">
                {(data.receita?.total ?? 0).toLocaleString('pt-MZ')} MTn
              </p>
              <p className={`card-variation ${(data.receita?.variacao ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                {(data.receita?.variacao ?? 0) >= 0 ? '⬆️ +' : '⬇️ '}{Math.abs(data.receita?.variacao ?? 0).toFixed(1)}% em relação ao mês anterior
              </p>
            </div>
          </div>

          <div className="indicator-card card-warning">
            <div className="card-header">
              <h3>🧾 Despesas do Mês</h3>
            </div>
            <div className="card-body">
              <p className="card-value">
                {(data.despesas?.total ?? 0).toLocaleString('pt-MZ')} MTn
              </p>
              <p className={`card-variation ${(data.despesas?.variacao ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                {(data.despesas?.variacao ?? 0) >= 0 ? '⬆️ +' : '⬇️ '}{Math.abs(data.despesas?.variacao ?? 0).toFixed(1)}% comparado ao mês anterior
              </p>
            </div>
          </div>

          <div className="indicator-card card-pending">
            <div className="card-header">
              <h3>⏳ Requisições Pendentes</h3>
            </div>
            <div className="card-body">
              <p className="card-value">{data.requisicoes?.total ?? 0}</p>
              <p className="card-details">
                <span className="badge badge-urgent">🔴 {data.requisicoes?.urgentes ?? 0} urgentes</span>
                <span className="badge badge-normal">🟡 {(data.requisicoes?.total ?? 0) - (data.requisicoes?.urgentes ?? 0)} normais</span>
              </p>
            </div>
          </div>

          <div className="indicator-card card-info">
            <div className="card-header">
              <h3>🏦 Fundos Activos</h3>
            </div>
            <div className="card-body">
              <p className="card-value">{data.fundos?.ativos ?? 0} Fundos</p>
              <div className="card-list">
                {(data.fundos?.balanco ?? []).map((fundo: any) => (
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
                {(data.fundos?.balanco ?? []).map((fundo: any) => (
                  <tr key={fundo.id}>
                    <td className="fund-name">{fundo.nome}</td>
                    <td className="fund-income">
                      {(fundo.entradas ?? 0).toLocaleString('pt-MZ')} MTn
                    </td>
                    <td className="fund-expense">
                      {(fundo.saidas ?? 0).toLocaleString('pt-MZ')} MTn
                    </td>
                    <td className="fund-balance">
                      {(fundo.saldo ?? 0).toLocaleString('pt-MZ')} MTn
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
