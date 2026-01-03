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

// URL base da API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

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
    register: (email: string, password: string, churchId: string) =>
      apiClient.post('/auth/register', { email, password, churchId }),
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
    getPending: () => apiClient.get('/requisitions/pending'),
    getById: (id: string) => apiClient.get(`/requisitions/${id}`),
    create: (data: {
      fundId: string;
      category: string;
      requestedAmount: number;
      justification: string;
      attachments?: string[];
    }) => apiClient.post('/requisitions', data),
    submit: (id: string) =>
      apiClient.put(`/requisitions/${id}/submit`, {}),
    approve: (id: string, approvedAmount?: number) =>
      apiClient.put(`/requisitions/${id}/approve`, { approvedAmount }),
    reject: (id: string, reason: string) =>
      apiClient.put(`/requisitions/${id}/reject`, { reason }),
    execute: (id: string) =>
      apiClient.put(`/requisitions/${id}/execute`, {}),
    cancel: (id: string) =>
      apiClient.put(`/requisitions/${id}/cancel`, {}),
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
};

export default apiClient;
