/// <reference types="vite/client" />
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * CLIENTE API (apiClient)
 * 
 * Responsabilidade: Centralizar todas as chamadas HTTP para o backend
 * 
 * Funcionalidades:
 * 1. Configuração base (baseURL, headers)
 * 2. Interceptor de autenticação (JWT)
 * 3. Interceptor de erro (tratamento centralizado)
 * 4. Endpoints pré-configurados
 * 
 * Uso:
 * import { apiClient, api } from '@/api/client';
 * 
 * // Chamada genérica:
 * const response = await apiClient.get('/auth/login', { ... });
 * 
 * // Ou usar endpoints pré-configurados:
 * const response = await api.auth.login(email, password);
 * 
 * Interceptadores:
 * - Request: Adiciona JWT no header Authorization
 * - Response: Trata erros e expirações
 * 
 * TODO:
 * - Refresh token automático
 * - Retry com backoff exponencial
 * - Cache de requisições GET
 */

// URL base da API (usa env do Vite e permite fallback manual)
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window as { __API_BASE_URL?: string }).__API_BASE_URL ||
  'http://localhost:3000/api';

// Criar instância Axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * INTERCEPTOR DE REQUEST
 * 
 * Adiciona JWT token no header Authorization
 * para cada requisição
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * INTERCEPTOR DE RESPONSE
 * 
 * Trata erros globalmente:
 * - 401 (Não autenticado): Limpar token e redirecionar para login
 * - 403 (Proibido): Mostrar mensagem de acesso negado
 * - 5xx (Servidor): Mostrar erro genérico
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (error.response?.status === 403) {
      // Sem permissão para acessar recurso
      console.error('Acesso negado');
    }

    return Promise.reject(error);
  }
);

/**
 * ENDPOINTS PRÉ-CONFIGURADOS
 * 
 * Agrupa chamadas por domínio de negócio
 * Facilita a reutilização em componentes
 */

export const api = {
  /**
   * AUTH - Autenticação
   * POST /auth/login
   * POST /auth/register
   */
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/auth/login', { email, password }),
    register: (data: {
      email: string;
      password: string;
      name: string;
      churchId: string;
      roles: string[];
    }) =>
      apiClient.post('/auth/register', data),
    getProfile: () => apiClient.get('/auth/profile'),
    updateProfile: (data: {
      nomeCompleto?: string;
      email?: string;
      username?: string;
      telefone?: string;
      cidade?: string;
    }) => apiClient.patch('/auth/profile', data),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', data),
  },

  /**
   * FINANCES - Gestão Financeira
   * GET /finances/fund/{id}/balance
   * GET /finances/income
   * POST /finances/income
   */
  finances: {
    getFundBalance: (fundId: string) =>
      apiClient.get(`/finances/fund/${fundId}/balance`),
    getIncomeByChurch: () =>
      apiClient.get('/finances/income/church'),
    getIncomeByFund: (fundId: string) =>
      apiClient.get(`/finances/income/fund/${fundId}`),
    recordIncome: (data: {
      fundId: string;
      incomeType: string;
      amount: number;
      date: string;
      observations?: string;
      attachments?: string[];
    }) => apiClient.post('/finances/income', data),
    listFunds: () => apiClient.get('/finances/funds'),
    listExpenses: (params: Record<string, any>) =>
      apiClient.get('/finances/expenses', { params }),
    listMovements: (params: Record<string, any>) =>
      apiClient.get('/finances/movements', { params }),
    getRevenues: () => apiClient.get('/finances/revenues'),
    recordRevenue: (payload: any) => apiClient.post('/finances/revenues', payload),
    getDailyRevenues: (date: string) =>
      apiClient.get('/finances/revenues/daily', { params: { date } }),
  },

  /**
   * REQUISITIONS - Requisições de Despesa
   * GET /requisitions
   * GET /requisitions/:id
   * POST /requisitions
   * PUT /requisitions/:id/submit
   * PUT /requisitions/:id/approve
   * PUT /requisitions/:id/reject
   * PUT /requisitions/:id/execute
   * PUT /requisitions/:id/cancel
   */
  requisitions: {
    list: () => apiClient.get('/requisitions'),
    listByStatus: (status: 'pending' | 'under-review' | 'approved' | 'executed') =>
      apiClient.get(`/requisitions/status/${status}`),
    getById: (id: string) => apiClient.get(`/requisitions/${id}`),
    create: (data: {
      fundId: string;
      categoria: string;
      valor: number;
      motivo: string;
      creatorType?: string;
    }) => apiClient.post('/requisitions', data),
    submit: (id: string) =>
      apiClient.patch(`/requisitions/${id}/submit`, {}),
    approve: (id: string, approvedAmount?: number) =>
      apiClient.patch(`/requisitions/${id}/approve`, { approvedAmount }),
    approveLevel2: (id: string, approvedAmount?: number) =>
      apiClient.patch(`/requisitions/${id}/approve-level2`, { approvedAmount }),
    reject: (id: string, motivo: string) =>
      apiClient.patch(`/requisitions/${id}/reject`, { motivo }),
    execute: (id: string, payload: { dataPagamento: string; comprovativoUrl?: string; observacoes?: string }) =>
      apiClient.patch(`/requisitions/${id}/execute`, payload),
    acknowledgePastor: (id: string) => apiClient.patch(`/requisitions/${id}/acknowledge-pastor`, {}),
  },

  /**
   * AUDIT - Auditoria
   * GET /audit/logs
   * GET /audit/logs/entity/{id}
   * GET /audit/logs/action/{action}
   * GET /audit/logs/user/{userId}
   * GET /audit/logs/period
   */
  audit: {
    getLogs: (limit: number = 100, offset: number = 0) =>
      apiClient.get('/audit/logs', { params: { limit, offset } }),
    getEntityLogs: (entityId: string) =>
      apiClient.get(`/audit/logs/entity/${entityId}`),
    getActionLogs: (action: string) =>
      apiClient.get(`/audit/logs/action/${action}`),
    getUserLogs: (userId: string) =>
      apiClient.get(`/audit/logs/user/${userId}`),
    getPeriodLogs: (startDate: string, endDate: string) =>
      apiClient.get('/audit/logs/period', {
        params: { startDate, endDate },
      }),
  },

  /**
   * REPORTS - Relatórios
   * GET /reports/monthly
   * GET /reports/general
   * GET /reports/fund/{fundId}
   * GET /reports/requisitions
   * GET /reports/compliance
   * GET /reports/anomalies
   */
  reports: {
    getMonthlyReport: (year: number, month: number) =>
      apiClient.get('/reports/monthly', {
        params: { year, month },
      }),
    getGeneralReport: (startDate: string, endDate: string) =>
      apiClient.get('/reports/general', {
        params: { startDate, endDate },
      }),
    getFundReport: (fundId: string) =>
      apiClient.get(`/reports/fund/${fundId}`),
    getRequisitionReport: () =>
      apiClient.get('/reports/requisitions'),
    getComplianceReport: (startDate: string, endDate: string) =>
      apiClient.get('/reports/compliance', {
        params: { startDate, endDate },
      }),
    detectAnomalies: () =>
      apiClient.get('/reports/anomalies'),
  },

  /**
   * CHURCHES - Gestão de Igrejas
   * GET /churches
   * GET /churches/:id
   * POST /churches
   * PUT /churches/:id
   * DELETE /churches/:id
   * PUT /churches/:id/pastor
   * PUT /churches/:id/lider-financeiro
   */
  churches: {
    getAll: () => apiClient.get('/churches'),
    getById: (id: string) => apiClient.get(`/churches/${id}`),
    create: (data: {
      nome: string;
      codigo?: string; // Opcional - gerado automaticamente no backend se não fornecido
      pastorLocalId?: string;
      liderFinanceiroLocalId?: string;
    }) => apiClient.post('/churches', data),
    update: (id: string, data: {
      nome?: string;
      activa?: boolean;
      pastorLocalId?: string;
      liderFinanceiroLocalId?: string;
    }) => apiClient.put(`/churches/${id}`, data),
    delete: (id: string) => apiClient.delete(`/churches/${id}`),
    assignPastor: (id: string, pastorId: string) =>
      apiClient.put(`/churches/${id}/pastor`, { pastorId }),
    assignLider: (id: string, liderId: string) =>
      apiClient.put(`/churches/${id}/lider-financeiro`, { liderId }),
  },

  /**
   * USERS - Gestão de Utilizadores (a implementar)
   */
  users: {
    getAll: () => apiClient.get('/users'),
    getByRole: (role: string) => apiClient.get('/users/role', { params: { role } }),
  },
};

export default apiClient;
