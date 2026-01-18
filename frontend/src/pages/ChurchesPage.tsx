import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import CreateChurchModal from '@/components/CreateChurchModal';
import EditChurchModal from '@/components/EditChurchModal';
import '@/styles/ChurchesPage.css';

/**
 * PÁGINA DE GESTÃO DE IGREJAS (ChurchesPage)
 * 
 * Funcionalidades:
 * 1. Listar todas as igrejas (tabela)
 * 2. Criar nova igreja (modal)
 * 3. Editar igreja com atribuição de pastor e líder (modal integrado)
 * 4. Gerir utilizadores de cada igreja
 * 5. Activar/Desactivar igreja
 * 
 * Permissões:
 * - ADMIN: Acesso total
 * - LIDER_FINANCEIRO_GERAL: Acesso total
 * - Outras roles: Só visualização da própria igreja
 */

interface Church {
  id: string;
  nome: string;
  codigo: string;
  activa: boolean;
  pastorLocalId?: string;
  liderFinanceiroLocalId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ChurchesPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Selected church para edição
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);

  // Carregar igrejas
  useEffect(() => {
    loadChurches();
  }, []);

  const loadChurches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.churches.getAll();
      setChurches(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar igrejas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadChurches();
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedChurch(null);
    loadChurches();
  };

  const openEditModal = (church: Church) => {
    setSelectedChurch(church);
    setShowEditModal(true);
  };

  const toggleChurchStatus = async (church: Church) => {
    if (!window.confirm(`Tem certeza que deseja ${church.activa ? 'desactivar' : 'activar'} a igreja "${church.nome}"?`)) {
      return;
    }

    try {
      await api.churches.update(church.id, { activa: !church.activa });
      loadChurches();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao actualizar igreja');
    }
  };

  if (loading) {
    return (
      <div className="churches-page">
        <div className="loading-state">
          <p>Carregando igrejas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="churches-page">
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={loadChurches}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="churches-page">
      {/* Header */}
      <div className="churches-header">
        <div>
          <h1>🏛️ Gestão de Igrejas</h1>
          <p className="churches-subtitle">
            Gerir igrejas, pastores, líderes financeiros e utilizadores
          </p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ Nova Igreja
        </button>
      </div>

      {/* Stats */}
      <div className="churches-stats">
        <div className="stat-card">
          <div className="stat-value">{churches.length}</div>
          <div className="stat-label">Total de Igrejas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{churches.filter(c => c.activa).length}</div>
          <div className="stat-label">Igrejas Activas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{churches.filter(c => c.pastorLocalId).length}</div>
          <div className="stat-label">Com Pastor Local</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{churches.filter(c => c.liderFinanceiroLocalId).length}</div>
          <div className="stat-label">Com Líder Financeiro</div>
        </div>
      </div>

      {/* Tabela de igrejas */}
      <div className="churches-table-container">
        <table className="churches-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Pastor Local</th>
              <th>Líder Financeiro</th>
              <th>Estado</th>
              <th>Acções</th>
            </tr>
          </thead>
          <tbody>
            {churches.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  Nenhuma igreja cadastrada. Clique em "Nova Igreja" para começar.
                </td>
              </tr>
            ) : (
              churches.map((church) => (
                <tr key={church.id}>
                  <td>
                    <span className="church-code">{church.codigo}</span>
                  </td>
                  <td>
                    <strong>{church.nome}</strong>
                  </td>
                  <td>
                    {church.pastorLocalId ? (
                      <span className="leader-assigned">✅ Atribuído</span>
                    ) : (
                      <span className="leader-notassigned">⚠️ Não atribuído</span>
                    )}
                  </td>
                  <td>
                    {church.liderFinanceiroLocalId ? (
                      <span className="leader-assigned">✅ Atribuído</span>
                    ) : (
                      <span className="leader-notassigned">⚠️ Não atribuído</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${church.activa ? 'active' : 'inactive'}`}>
                      {church.activa ? '🟢 Activa' : '🔴 Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        onClick={() => openEditModal(church)}
                        title="Editar e atribuir pastor/líder"
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn-icon ${church.activa ? 'danger' : 'success'}`}
                        onClick={() => toggleChurchStatus(church)}
                        title={church.activa ? 'Desactivar' : 'Activar'}
                      >
                        {church.activa ? '🚫' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateChurchModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showEditModal && selectedChurch && (
        <EditChurchModal
          church={selectedChurch}
          onClose={() => {
            setShowEditModal(false);
            setSelectedChurch(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
