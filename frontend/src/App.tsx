import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import RequisitionsPage from '@/pages/RequisitionsPage';
import AuditPage from '@/pages/AuditPage';
import ReportsPage from '@/pages/ReportsPage';
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
          
          {/* Dashboard - home protegida */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          {/* Requisições */}
          <Route
            path="/requisitions"
            element={
              <ProtectedRoute>
                <RequisitionsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Auditoria */}
          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <AuditPage />
              </ProtectedRoute>
            }
          />
          
          {/* Relatórios */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Rota não encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
