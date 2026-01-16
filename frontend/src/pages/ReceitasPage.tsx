import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { PAYMENT_METHODS, REVENUE_TYPES, WEEKDAYS, WORSHIP_TYPES } from '@/constants/finance';
import { useAuth } from '@/context/AuthContext';
import '@/styles/ReceitasPage.css';

interface FundOption {
  id: string;
  type: string;
  description?: string;
  balance: string;
}

interface DistributionItem {
  fundId: string;
  amount: string;
}

interface RevenueSummary {
  id: string;
  type: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  worship?: {
    type: string;
    serviceDate: string;
  };
  allocations?: Array<{
    id: string;
    amount: number;
    fund: {
      id: string;
      type: string;
    };
  }>;
}

const getCurrentDateISO = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const dateToWeekday = (dateValue: string) => {
  const date = dateValue.includes('T') ? new Date(dateValue) : new Date(`${dateValue}T00:00:00`);
  const dayIndex = date.getDay();
  const map = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
  return map[dayIndex] ?? 'DOMINGO';
};

const weekdayLabel = (value: string) => WEEKDAYS.find((w) => w.value === value)?.label ?? value;

const revenueTypeLabel = (value: string) => REVENUE_TYPES.find((item) => item.value === value)?.label ?? value;

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });

export default function ReceitasPage() {
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [distributions, setDistributions] = useState<DistributionItem[]>([]);
  const [dailyRevenues, setDailyRevenues] = useState<RevenueSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    type: REVENUE_TYPES[0].value,
    totalAmount: '',
    paymentMethod: PAYMENT_METHODS[0].value,
    date: getCurrentDateISO(),
    weekday: dateToWeekday(getCurrentDateISO()),
    worshipType: WORSHIP_TYPES[0].value,
    location: '',
    worshipNotes: '',
    notes: '',
  });

  const totalAllocated = useMemo(() => {
    return distributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [distributions]);

  const totalValue = Number(form.totalAmount || 0);
  const difference = Number((totalValue - totalAllocated).toFixed(2));

  const canSubmit =
    totalValue > 0 &&
    distributions.length > 0 &&
    Math.abs(difference) < 0.01 &&
    distributions.every((item) => Number(item.amount) > 0);

  const loadFunds = async () => {
    setLoading(true);
    try {
      const response = await api.finances.listFunds();
      setFunds(response.data);
      if (!distributions.length && response.data.length) {
        setDistributions([{ fundId: response.data[0].id, amount: '' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDailyRevenues = async (dateValue: string) => {
    const response = await api.finances.getDailyRevenues(dateValue);
    setDailyRevenues(response.data);
  };

  useEffect(() => {
    loadFunds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDailyRevenues(form.date);
  }, [form.date]);

  const handleFormChange = (field: keyof typeof form, value: string) => {
    if (field === 'date') {
      const weekday = dateToWeekday(value);
      setForm((prev) => ({ ...prev, date: value, weekday }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDistributionChange = (index: number, field: keyof DistributionItem, value: string) => {
    setDistributions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveDistribution = (index: number) => {
    setDistributions((prev) => prev.filter((_, position) => position !== index));
  };

  const handleAddDistribution = () => {
    if (!funds.length) return;
    const defaultFund = funds.find((fund) => !distributions.some((item) => item.fundId === fund.id)) || funds[0];
    const remaining = Math.max(difference, 0);
    setDistributions((prev) => [...prev, { fundId: defaultFund.id, amount: remaining ? remaining.toString() : '' }]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setFeedback({ type: 'error', message: 'Distribuição deve ser igual ao valor total.' });
      return;
    }

    const payload = {
      type: form.type,
      totalAmount: Number(form.totalAmount),
      paymentMethod: form.paymentMethod,
      notes: form.notes || undefined,
      worship: {
        type: form.worshipType,
        weekday: form.weekday,
        serviceDate: form.date,
        location: form.location || undefined,
        observations: form.worshipNotes || undefined,
      },
      distribution: distributions.map((item) => ({
        fundId: item.fundId,
        amount: Number(item.amount),
      })),
    };

    setSubmitting(true);
    setFeedback(null);

    try {
      await api.finances.recordRevenue(payload);
      setFeedback({ type: 'success', message: 'Receita registada com sucesso.' });
      setForm((prev) => ({
        ...prev,
        totalAmount: '',
        notes: '',
      }));
      setDistributions((prev) => prev.map((item) => ({ ...item, amount: '' }))); // keep same funds but reset amounts
      loadDailyRevenues(form.date);
      loadFunds();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao registar receita';
      setFeedback({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <h2>eSIGIEJOD</h2>
          <p>Sistema de Gestão Financeira</p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className="nav-item">
            <span className="nav-icon">📊</span>
            Dashboard
          </Link>
          <Link to="/receitas" className="nav-item active">
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

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-info">
            <h1>Gestão de Receitas</h1>
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

        <section className="receitas-card">
          <div className="receitas-card-header">
            <div>
              <h2>Nova Receita</h2>
              <p>Registe o culto, total recebido e distribuição por fundos.</p>
            </div>
          </div>
          <form className="receitas-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Tipo de Receita
                <select
                  value={form.type}
                  onChange={(event) => handleFormChange('type', event.target.value)}
                >
                  {REVENUE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Valor Total (MTn)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={(event) => handleFormChange('totalAmount', event.target.value)}
                  required
                />
              </label>

              <label>
                Forma de Entrada
                <select
                  value={form.paymentMethod}
                  onChange={(event) => handleFormChange('paymentMethod', event.target.value)}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Data do Culto
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => handleFormChange('date', event.target.value)}
                  required
                />
              </label>

              <label>
                Dia da Semana
                <select
                  value={form.weekday}
                  onChange={(event) => handleFormChange('weekday', event.target.value)}
                >
                  {WEEKDAYS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tipo de Culto
                <select
                  value={form.worshipType}
                  onChange={(event) => handleFormChange('worshipType', event.target.value)}
                >
                  {WORSHIP_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Local
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => handleFormChange('location', event.target.value)}
                  placeholder="Igreja local, campo, monte..."
                />
              </label>

              <label>
                Observações do Culto
                <textarea
                  value={form.worshipNotes}
                  onChange={(event) => handleFormChange('worshipNotes', event.target.value)}
                  rows={3}
                  placeholder="Notas específicas do culto"
                />
              </label>

              <label className="full-width">
                Observações da Receita
                <textarea
                  value={form.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  rows={3}
                  placeholder="Detalhes adicionais sobre a receita"
                />
              </label>
            </div>

            <div className="distribution-header">
              <h3>Distribuição por Fundos</h3>
              <button
                type="button"
                className="btn-add"
                onClick={handleAddDistribution}
                disabled={!funds.length}
              >
                Adicionar Fundo
              </button>
            </div>

            <div className="distribution-table">
              <div className="table-header">
                <span>Fundo</span>
                <span>Valor Alocado (MTn)</span>
                <span></span>
              </div>
              {distributions.map((item, index) => (
                <div key={`distribution-${index}`} className="table-row">
                  <select
                    value={item.fundId}
                    onChange={(event) => handleDistributionChange(index, 'fundId', event.target.value)}
                  >
                    {funds.map((fund) => (
                      <option key={fund.id} value={fund.id}>
                        {fund.type.replace('FUNDO_', '').replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(event) => handleDistributionChange(index, 'amount', event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveDistribution(index)}
                    disabled={distributions.length === 1}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>

            <div className="distribution-summary">
              <p>Total distribuído: <strong>{formatCurrency(totalAllocated)}</strong></p>
              <p>Diferença: <strong className={Math.abs(difference) < 0.01 ? 'ok' : 'alert'}>{formatCurrency(difference)}</strong></p>
            </div>

            {feedback && (
              <div className={`feedback ${feedback.type}`}>
                {feedback.message}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={!canSubmit || submitting}>
                {submitting ? 'A guardar...' : 'Guardar Receita'}
              </button>
            </div>
          </form>
        </section>

        <section className="receitas-history">
          <h2>Histórico Diário ({form.date})</h2>
          {dailyRevenues.length === 0 ? (
            <p>Nenhuma receita registada para esta data.</p>
          ) : (
            <div className="history-table">
              <div className="history-header">
                <span>Tipo</span>
                <span>Forma</span>
                <span>Valor</span>
                <span>Distribuição</span>
                <span>Registado</span>
              </div>
              {dailyRevenues.map((revenue) => (
                <div key={revenue.id} className="history-row">
                  <span>{revenueTypeLabel(revenue.type)}</span>
                  <span>{PAYMENT_METHODS.find((method) => method.value === revenue.paymentMethod)?.label ?? revenue.paymentMethod}</span>
                  <span>{formatCurrency(Number(revenue.totalAmount))}</span>
                  <span>
                    {revenue.allocations?.map((allocation) => (
                      <small key={allocation.id}>
                        {allocation.fund.type.replace('FUNDO_', '').replace('_', ' ')}: {formatCurrency(Number(allocation.amount))}
                      </small>
                    ))}
                  </span>
                  <span>
                    {revenue.worship?.serviceDate
                      ? `${weekdayLabel(dateToWeekday(revenue.worship.serviceDate))} (${revenue.worship.serviceDate.slice(0, 10)})`
                      : new Date(revenue.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
