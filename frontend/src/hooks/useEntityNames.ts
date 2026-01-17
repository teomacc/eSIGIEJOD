import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

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

const churchCache: Record<string, string> = {};
const userCache: Record<string, string> = {};

/**
 * Hook para carregar e cachear informações de igrejas e usuários
 * Evita múltiplas requisições para os mesmos dados
 */
export const useEntityNames = () => {
  const [churches, setChurches] = useState<Record<string, string>>(churchCache);
  const [users, setUsers] = useState<Record<string, string>>(userCache);
  const [loading, setLoading] = useState(false);

  const loadChurch = async (churchId: string) => {
    if (churchCache[churchId]) {
      setChurches({ ...churches, [churchId]: churchCache[churchId] });
      return;
    }

    try {
      // Tenta obter o nome da igreja via API
      // Ajuste o endpoint conforme necessário
      const response = await apiClient.get(`/churches/${churchId}`);
      const name = response.data?.name || churchId;
      churchCache[churchId] = name;
      setChurches((prev) => ({ ...prev, [churchId]: name }));
    } catch (error) {
      console.warn(`Não foi possível carregar igreja ${churchId}:`, error);
      churchCache[churchId] = churchId;
      setChurches((prev) => ({ ...prev, [churchId]: churchId }));
    }
  };

  const loadUser = async (userId: string) => {
    if (userCache[userId]) {
      setUsers({ ...users, [userId]: userCache[userId] });
      return;
    }

    try {
      // Tenta obter o nome do usuário via API
      // Ajuste o endpoint conforme necessário
      const response = await apiClient.get(`/users/${userId}`);
      const name = response.data?.fullName || response.data?.name || response.data?.email || userId;
      userCache[userId] = name;
      setUsers((prev) => ({ ...prev, [userId]: name }));
    } catch (error) {
      console.warn(`Não foi possível carregar usuário ${userId}:`, error);
      userCache[userId] = userId;
      setUsers((prev) => ({ ...prev, [userId]: userId }));
    }
  };

  const loadBatch = async (churchIds: string[], userIds: string[]) => {
    setLoading(true);
    try {
      const promises = [
        ...churchIds.filter((id) => !churchCache[id]).map(loadChurch),
        ...userIds.filter((id) => !userCache[id]).map(loadUser),
      ];
      await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao carregar dados em lote:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    churches,
    users,
    loading,
    loadChurch,
    loadUser,
    loadBatch,
  };
};
