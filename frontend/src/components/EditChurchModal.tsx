import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import '@/styles/Modal.css';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface EditChurchModalProps {
  church: {
    id: string;
    nome: string;
    codigo: string;
    activa: boolean;
    pastorLocalId?: string;
    liderFinanceiroLocalId?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditChurchModal({ church, onClose, onSuccess }: EditChurchModalProps) {
  const [formData, setFormData] = useState({
    nome: church.nome,
    activa: church.activa,
    pastorLocalId: church.pastorLocalId || '',
    liderFinanceiroLocalId: church.liderFinanceiroLocalId || '',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [pastores, setPastores] = useState<User[]>([]);
  const [lideres, setLideres] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar utilizadores ao montar
  useEffect(() => {
    loadUsers();
  }, []);

  // Filtrar pastores e líderes quando utilizadores mudam
  useEffect(() => {
    setPastores(users.filter(u => u.roles?.includes('PASTOR_LOCAL')));
    setLideres(users.filter(u => u.roles?.includes('LIDER_FINANCEIRO_LOCAL')));
  }, [users]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await apiClient.get('/auth/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err);
      setError('Erro ao carregar utilizadores');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiClient.put(`/churches/${church.id}`, {
        nome: formData.nome,
        activa: formData.activa,
        pastorLocalId: formData.pastorLocalId || undefined,
        liderFinanceiroLocalId: formData.liderFinanceiroLocalId || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao actualizar igreja');
    } finally {
      setLoading(false);
    }
  };

  const getPastorName = (id?: string) => {
    if (!id) return 'Nenhum';
    const pastor = pastores.find(p => p.id === id);
    return pastor ? `${pastor.name} (${pastor.email})` : 'Desconhecido';
  };

  const getLiderName = (id?: string) => {
    if (!id) return 'Nenhum';
    const lider = lideres.find(l => l.id === id);
    return lider ? `${lider.name} (${lider.email})` : 'Desconhecido';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Editar Igreja</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                ❌ {error}
              </div>
            )}

            <div className="form-group">
              <label>Código</label>
              <input
                type="text"
                value={church.codigo}
                disabled
                className="input-disabled"
                title="Código da igreja (não editável)"
              />
              <small>O código não pode ser alterado</small>
            </div>

            <div className="form-group">
              <label htmlFor="nome">Nome da Igreja *</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Nome da igreja"
                required
                maxLength={200}
                autoFocus
              />
            </div>

            {/* Pastor Local */}
            <div className="form-group">
              <label htmlFor="pastorLocalId">Pastor Local</label>
              {loadingUsers ? (
                <p className="form-hint">Carregando pastores...</p>
              ) : pastores.length === 0 ? (
                <p className="form-hint">Nenhum pastor local disponível</p>
              ) : (
                <>
                  <select
                    id="pastorLocalId"
                    name="pastorLocalId"
                    value={formData.pastorLocalId}
                    onChange={handleChange}
                  >
                    <option value="">-- Seleccionar Pastor --</option>
                    {pastores.map((pastor) => (
                      <option key={pastor.id} value={pastor.id}>
                        {pastor.name} ({pastor.email})
                      </option>
                    ))}
                  </select>
                  {formData.pastorLocalId && (
                    <small>✅ Pastor: {getPastorName(formData.pastorLocalId)}</small>
                  )}
                </>
              )}
            </div>

            {/* Líder Financeiro Local */}
            <div className="form-group">
              <label htmlFor="liderFinanceiroLocalId">Líder Financeiro Local</label>
              {loadingUsers ? (
                <p className="form-hint">Carregando líderes...</p>
              ) : lideres.length === 0 ? (
                <p className="form-hint">Nenhum líder financeiro local disponível</p>
              ) : (
                <>
                  <select
                    id="liderFinanceiroLocalId"
                    name="liderFinanceiroLocalId"
                    value={formData.liderFinanceiroLocalId}
                    onChange={handleChange}
                  >
                    <option value="">-- Seleccionar Líder --</option>
                    {lideres.map((lider) => (
                      <option key={lider.id} value={lider.id}>
                        {lider.name} ({lider.email})
                      </option>
                    ))}
                  </select>
                  {formData.liderFinanceiroLocalId && (
                    <small>✅ Líder: {getLiderName(formData.liderFinanceiroLocalId)}</small>
                  )}
                </>
              )}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="activa"
                  checked={formData.activa}
                  onChange={handleChange}
                />
                <span>Igreja Activa</span>
              </label>
              <small>
                {formData.activa
                  ? '🟢 Esta igreja está activa e operacional'
                  : '🔴 Igreja inactiva (sem transacções)'}
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
