import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/client';
import { getDataScopeDescription, getRoleLabel, UserRole } from '@/utils/permissions';
import './ChurchInfo.css';

/**
 * COMPONENTE - Informação da Igreja
 * 
 * Mostra ao utilizador:
 * - Qual é a sua igreja
 * - Quais são seus papéis
 * - Qual é seu alcance de dados
 * 
 * Útil para:
 * - Confirmar que está na igreja correta
 * - Entender quais páginas pode acessar
 * - Saber que dados pode ver
 */
export function ChurchInfo() {
  const { user } = useAuth();
  const [churchName, setChurchName] = useState<string>('');
  const [churchCode, setChurchCode] = useState<string>('');
  const roles = user?.roles ?? [];

  const isGlobalUser =
    roles.includes(UserRole.LIDER_FINANCEIRO_GERAL) ||
    roles.includes(UserRole.ADMIN);

  const isLocalUser =
    roles.includes(UserRole.PASTOR_LOCAL) ||
    roles.includes(UserRole.LIDER_FINANCEIRO_LOCAL) ||
    roles.includes(UserRole.PASTOR_PRESIDENTE);

  useEffect(() => {
    const loadChurch = async () => {
      if (!user?.churchId) {
        setChurchName('Acesso Global');
        setChurchCode('');
        return;
      }
      try {
        const { data } = await apiClient.get(`/churches/${user.churchId}`);
        setChurchName(data?.nome || 'Igreja');
        setChurchCode(data?.codigo || user.churchId.slice(0, 6));
      } catch (error) {
        setChurchName('Igreja');
        setChurchCode(user.churchId.slice(0, 6));
      }
    };

    loadChurch();
  }, [user?.churchId]);

  if (!user) return null;

  return (
    <div className="church-info-container">
      <div className="church-info-card">
        <div className="info-section">
          <div className="info-icon">👤</div>
          <div className="info-content">
            <h3>Utilizador</h3>
            <p className="info-value">{user.name || user.email}</p>
          </div>
        </div>

        <div className="info-divider"></div>

        <div className="info-section">
          <div className="info-icon">🏛️</div>
          <div className="info-content">
            <h3>Alcance de Dados</h3>
            <p className="info-value">{getDataScopeDescription(user.roles)}</p>
            {isLocalUser && user.churchId && (
              <p className="church-id">{churchName} {churchCode ? `(${churchCode})` : ''}</p>
            )}
            {isGlobalUser && <p className="global-badge">🌍 Acesso Global</p>}
          </div>
        </div>

        <div className="info-divider"></div>

        <div className="info-section">
          <div className="info-icon">🔐</div>
          <div className="info-content">
            <h3>Papéis</h3>
            <div className="roles-list">
              {user.roles.map((role) => (
                <span key={role} className="role-badge">
                  {getRoleLabel(role)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alert se informações críticas faltarem */}
      {isLocalUser && !user.churchId && (
        <div className="alert alert-warning church-info-alert">
          ⚠️ Atenção: Sua conta não está vinculada a uma igreja. Contate um administrador.
        </div>
      )}
    </div>
  );
}

export default ChurchInfo;
