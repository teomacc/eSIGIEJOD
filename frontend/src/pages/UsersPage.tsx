import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import '@/styles/UsersPage.css';

interface User {
  id: string;
  nomeCompleto: string;
  email: string;
  username: string;
  roles: string[];
  ativo: boolean;
  churchId?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/auth/all-users');
      setUsers(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar utilizadores');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    if (!window.confirm(`Tem certeza que deseja ${user.ativo ? 'desactivar' : 'activar'} ${user.nomeCompleto}?`)) {
      return;
    }

    try {
      await apiClient.patch(`/auth/users/${user.id}`, { ativo: !user.ativo });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao actualizar utilizador');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      ADMIN: 'Administrador',
      PASTOR_PRESIDENTE: 'Pastor Presidente',
      LIDER_FINANCEIRO_GERAL: 'Líder Financeiro Geral',
      PASTOR_LOCAL: 'Pastor Local',
      LIDER_FINANCEIRO_LOCAL: 'Líder Financeiro Local',
      OBREIRO: 'Obreiro',
    };
    return labels[role] || role;
  };

  const filteredUsers = users.filter(user =>
    user.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="users-page">
        <div className="loading-state">
          <p>Carregando utilizadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      {/* Header */}
      <div className="users-header">
        <div>
          <h1>👥 Gestão de Utilizadores</h1>
          <p className="users-subtitle">
            Listar, editar e gerir permissões de utilizadores
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {/* Search */}
      <div className="users-search">
        <input
          type="text"
          placeholder="🔍 Procurar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Stats */}
      <div className="users-stats">
        <div className="stat-card">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total de Utilizadores</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.ativo).length}</div>
          <div className="stat-label">Utilizadores Activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.includes('ADMIN')).length}</div>
          <div className="stat-label">Administradores</div>
        </div>
      </div>

      {/* Tabela */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Username</th>
              <th>Papéis</th>
              <th>Estado</th>
              <th>Acções</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  Nenhum utilizador encontrado
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.nomeCompleto}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <code>{user.username}</code>
                  </td>
                  <td>
                    <div className="roles-badge">
                      {user.roles?.map((role) => (
                        <span key={role} className={`role-pill role-${role.toLowerCase()}`}>
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${user.ativo ? 'active' : 'inactive'}`}>
                      {user.ativo ? '🟢 Activo' : '🔴 Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className={`btn-icon ${user.ativo ? 'danger' : 'success'}`}
                        onClick={() => toggleUserStatus(user)}
                        title={user.ativo ? 'Desactivar' : 'Activar'}
                      >
                        {user.ativo ? '🚫' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
