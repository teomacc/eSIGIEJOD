import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPageComplete';
import DashboardPage from '@/pages/DashboardPage';
import RequisitionsPage from '@/pages/RequisitionsPage';
import DespesasPage from '@/pages/DespesasPage';
import AuditPage from '@/pages/AuditPage';
import ReportsPage from '@/pages/ReportsPage';
import ReceitasPage from '@/pages/ReceitasPage';
import ChurchesPage from '@/pages/ChurchesPage';
import UsersPage from '@/pages/UsersPage';
import ProfilePage from '@/pages/ProfilePage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import '@/styles/globals.css';

/**
 * APLICAÇÃO PRINCIPAL (App)
 * 
 * Responsabilidade: Roteamento e layout da aplicação
 * 
 * Estrutura:
 * 1. AuthProvider envolve toda a app (fornece contexto de auth)
 * 2. BrowserRouter para roteamento
 * 3. ProtectedRoute para proteger páginas
 * 4. Routes define as páginas
 * 
 * Fluxo:
 * 1. User acessa /
 * 2. Router verifica se autenticado
 * 3. Se sim: Mostra Dashboard
 * 4. Se não: Redireciona para Login
 * 
 * Rotas:
 * - /login: LoginPage (pública)
 * - /register: RegisterPage (protegida, apenas DIRECTOR/TREASURER)
 * - /: DashboardPage (protegida)
 * - /requisitions: RequisitionsPage (protegida)
 * - /audit: AuditPage (protegida, AUDITOR+)
 * - /reports: ReportsPage (protegida)
 */

/**
 * COMPONENTE DE ROTA PROTEGIDA
 * 
 * Verifica se usuário está autenticado antes de mostrar página
 * Se não autenticado, redireciona para /login
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login - pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas protegidas com Layout */}
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Dashboard - home protegida */}
            <Route path="/" element={<DashboardPage />} />
            
            {/* Registo - protegida (apenas DIRECTOR/TREASURER) */}
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Requisições */}
            <Route path="/requisitions" element={<RequisitionsPage />} />

            {/* Despesas */}
            <Route path="/despesas" element={<DespesasPage />} />

            {/* Receitas */}
            <Route path="/receitas" element={<ReceitasPage />} />
            
            {/* Igrejas - Admin */}
            <Route path="/igrejas" element={<ChurchesPage />} />
            
            {/* Utilizadores - Admin */}
            <Route path="/utilizadores" element={<UsersPage />} />
            
            {/* Auditoria */}
            <Route path="/audit" element={<AuditPage />} />
            
            {/* Relatórios */}
            <Route path="/reports" element={<ReportsPage />} />

            {/* Perfil */}
            <Route path="/perfil" element={<ProfilePage />} />

            {/* Alterar senha */}
            <Route path="/alterar-senha" element={<ChangePasswordPage />} />
          </Route>
          
          {/* Rota não encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
