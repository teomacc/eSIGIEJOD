import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useEntityNames } from '@/hooks/useEntityNames';
import '@/styles/DespesasPage.css';

interface Despesa {
  id: string;
  requisicaoId?: string;
  churchId: string;
  fundId: string;
  valor: number | string;
  dataPagamento: string;
  executadoPor: string;
  comprovativoUrl?: string;
  observacoes?: string;
  requisicao?: {
    id: string;
    code: string;
    justification?: string;
    fundId?: string;
  };
}

interface Church {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
}

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fundFilter, setFundFilter] = useState('');
  const [churchFilter, setChurchFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [requisitionsApproved, setRequisitionsApproved] = useState(0);
  const { churches, users, loadBatch } = useEntityNames();

  useEffect(() => {
    fetchDespesas();
    loadApprovedRequisitions();
  }, []);

  useEffect(() => {
    if (despesas.length > 0) {
      const churchIds = [...new Set(despesas.map((d) => d.churchId))];
      const userIds = [...new Set(despesas.map((d) => d.executadoPor))];
      loadBatch(churchIds, userIds);
    }
  }, [despesas]);

  const loadApprovedRequisitions = async () => {
    try {
      const res = await api.requisitions.listByStatus('approved');
      setRequisitionsApproved(res.data?.length || 0);
    } catch (error) {
      console.error('Erro ao carregar requisições aprovadas:', error);
    }
  };

  const totalMes = despesas
    .filter((d) => {
      const dataExec = new Date(d.dataPagamento);
      const hoje = new Date();
      return (
        dataExec.getMonth() === hoje.getMonth() &&
        dataExec.getFullYear() === hoje.getFullYear()
      );
    })
    .reduce((sum, d) => sum + Number(d.valor), 0);

  const totalHoje = despesas
    .filter((d) => {
      const dataExec = new Date(d.dataPagamento);
      const hoje = new Date();
      return dataExec.toDateString() === hoje.toDateString();
    })
    .reduce((sum, d) => sum + Number(d.valor), 0);

  const gastosPorFundo: Record<string, number> = {};
  despesas.forEach((d) => {
    if (!gastosPorFundo[d.fundId]) {
      gastosPorFundo[d.fundId] = 0;
    }
    gastosPorFundo[d.fundId] += Number(d.valor);
  });
  const fundoMaiorGasto = Object.keys(gastosPorFundo).length > 0
    ? Object.entries(gastosPorFundo).sort((a, b) => b[1] - a[1])[0]
    : null;

  const fetchDespesas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (fundFilter) params.append('fundId', fundFilter);
      if (churchFilter) params.append('churchId', churchFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (minAmount) params.append('minAmount', minAmount);
      if (maxAmount) params.append('maxAmount', maxAmount);

      const query: Record<string, any> = {};
      params.forEach((value, key) => {
        query[key] = value;
      });

      const response = await api.finances.listExpenses(query);
      const items = (response?.data?.data ?? []) as Despesa[];
      setDespesas(items);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      setDespesas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDespesas();
  };

  const handleClearFilters = () => {
    setSearch('');
    setFundFilter('');
    setChurchFilter('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const formatCurrency = (value: number | string) =>
    Number(value).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-MZ');

  return (
    <div className="despesas-page">
      <header className="despesas-header">
        <h1>Despesas</h1>
        <p>Consulta de despesas executadas</p>
      </header>

      {/* Cards de resumo */}
      <div className="despesas-cards">
        <div className="despesas-card">
          <h3>Total do Mês</h3>
          <p className="card-value">{formatCurrency(totalMes)}</p>
        </div>
        <div className="despesas-card">
          <h3>Hoje</h3>
          <p className="card-value">{formatCurrency(totalHoje)}</p>
        </div>
        <div className="despesas-card">
          <h3>Aprovadas p/ Executar</h3>
          <p className="card-value">{requisitionsApproved}</p>
        </div>
        <div className="despesas-card">
          <h3>Fundo com Maior Gasto</h3>
          <p className="card-value">
            {fundoMaiorGasto ? `${formatCurrency(fundoMaiorGasto[1])}` : '--'}
          </p>
        </div>
      </div>

      {/* Filtros avançados */}
      <div className="despesas-filters">
        <input
          type="text"
          placeholder="Pesquisar por descrição ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={fundFilter} onChange={(e) => setFundFilter(e.target.value)} aria-label="Filtrar por fundo">
          <option value="">Todos os Fundos</option>
          {/* TODO: Carregar fundos dinamicamente */}
        </select>
        <select value={churchFilter} onChange={(e) => setChurchFilter(e.target.value)} aria-label="Filtrar por igreja">
          <option value="">Todas as Igrejas</option>
          {/* TODO: Carregar igrejas dinamicamente */}
        </select>
        <input
          type="date"
          placeholder="Data Início"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          placeholder="Data Fim"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <input
          type="number"
          placeholder="Valor Mínimo"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
        />
        <input
          type="number"
          placeholder="Valor Máximo"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
        />
        <button onClick={handleSearch}>Pesquisar</button>
        <button onClick={handleClearFilters}>Limpar</button>
      </div>

      {/* Tabela de despesas */}
      <div className="despesas-table-container">
        {loading ? (
          <p>A carregar...</p>
        ) : (
          <table className="despesas-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Data Execução</th>
                <th>Fundo</th>
                <th>Igreja</th>
                <th>Executor</th>
                <th>Origem</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {despesas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center' }}>
                    Nenhuma despesa encontrada
                  </td>
                </tr>
              ) : (
                despesas.map((despesa) => (
                  <tr key={despesa.id}>
                    <td>{despesa.requisicao?.code ?? '—'}</td>
                    <td>{despesa.requisicao?.justification ?? despesa.observacoes ?? '—'}</td>
                    <td>{formatCurrency(despesa.valor)}</td>
                    <td>{formatDate(despesa.dataPagamento)}</td>
                    <td>{despesa.fundId ?? '—'}</td>
                    <td>{churches[despesa.churchId] ?? despesa.churchId ?? '—'}</td>
                    <td>{users[despesa.executadoPor] ?? despesa.executadoPor ?? '—'}</td>
                    <td>{despesa.requisicaoId ? 'Requisição' : 'Direto'}</td>
                    <td>
                      <button className="btn-view">Ver Detalhes</button>
                      {despesa.requisicaoId && (
                        <button className="btn-view">Ver Requisição</button>
                      )}
                      <button className="btn-export">Exportar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
