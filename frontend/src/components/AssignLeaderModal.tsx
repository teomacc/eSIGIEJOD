import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import '@/styles/Modal.css';

interface AssignLeaderModalProps {
  church: {
    id: string;
    nome: string;
    pastorLocalId?: string;
    liderFinanceiroLocalId?: string;
  };
  type: 'pastor' | 'lider';
  onClose: () => void;
  onSuccess: () => void;
}

interface User {
  id: string;
  nomeCompleto: string;
  email: string;
  roles: string[];
}

export default function AssignLeaderModal({
  church,
  type,
  onClose,
  onSuccess,
}: AssignLeaderModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPastor = type === 'pastor';
  const title = isPastor ? 'Pastor Local' : 'Líder Financeiro Local';
  const role = isPastor ? 'PASTOR_LOCAL' : 'LIDER_FINANCEIRO_LOCAL';

  useEffect(() => {
    loadUsers();
  }, [role]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.users.getByRole(role);
      setUsers(response.data);
      
      // Pre-selecionar se já tem alguém atribuído
      if (isPastor && church.pastorLocalId) {
        setSelectedUserId(church.pastorLocalId);
      } else if (!isPastor && church.liderFinanceiroLocalId) {
        setSelectedUserId(church.liderFinanceiroLocalId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar utilizadores');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setError('Seleccione um utilizador');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (isPastor) {
        await api.churches.assignPastor(church.id, selectedUserId);
      } else {
        await api.churches.assignLider(church.id, selectedUserId);
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atribuir líder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isPastor ? '👤' : '💼'} Atribuir {title}</h2>
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

            <div className="info-box mb-3">
              <p>
                <strong>Igreja:</strong> {church.nome}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="userId">Seleccionar {title} *</label>
              {loadingUsers ? (
                <p>Carregando utilizadores...</p>
              ) : users.length === 0 ? (
                <div className="alert alert-warning">
                  ⚠️ Nenhum utilizador com role <strong>{role}</strong> encontrado.
                  <br />
                  <small>Crie utilizadores com este perfil primeiro.</small>
                </div>
              ) : (
                <>
                  <select
                    id="userId"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">-- Seleccione --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.nomeCompleto} ({user.email})
                      </option>
                    ))}
                  </select>
                  <small>
                    {users.length} {users.length === 1 ? 'utilizador encontrado' : 'utilizadores encontrados'}
                  </small>
                </>
              )}
            </div>

            <div className="info-box">
              <p>
                ℹ️ <strong>Nota:</strong> {isPastor ? 'O Pastor Local' : 'O Líder Financeiro Local'}{' '}
                será responsável por {isPastor ? 'aprovar requisições de nível 2' : 'aprovar requisições de nível 1'}{' '}
                e executar despesas desta igreja.
              </p>
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
              disabled={loading || loadingUsers || users.length === 0}
            >
              {loading ? 'Atribuindo...' : '✅ Atribuir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
