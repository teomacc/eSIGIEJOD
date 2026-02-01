import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '@/styles/LoginPage.css';

/**
 * PÁGINA DE LOGIN (LoginPage)
 * 
 * Responsabilidade: Formulário de autenticação
 * 
 * Funcionalidades:
 * - Campo de email/username
 * - Campo de password
 * - Validação de formulário
 * - Botão de login com estado de carregamento
 * - Mensagens de erro claras
 * - Design moderno e responsivo
 * - Suporte a email E username
 * 
 * Fluxo:
 * 1. Usuário entra email/username e password
 * 2. Submit chama useAuth().login()
 * 3. Se sucesso: Redireciona para /
 * 4. Se erro: Mostra mensagem
 */

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  // Validar formulário em tempo real
  useEffect(() => {
    const valid = emailOrUsername.trim().length > 0 && password.length > 0;
    setIsFormValid(valid);
  }, [emailOrUsername, password]);

  // Se já autenticado, redirecionar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isFormValid) {
      return;
    }

    try {
      await login(emailOrUsername, password);
      navigate('/');
    } catch (err) {
      // Erro já gerenciado pelo useAuth
      console.error('Erro no login:', err);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailOrUsername(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  // Prevenir backspace de causar navegação (voltar página)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      // Apenas prevenir se NÃO estiver dentro de um input
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  return (
    <div className="login-page" onKeyDown={handleKeyDown}>
      <div className="login-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="login-logo">⛪</div>
            <h1>eSIGIEJOD</h1>
            <p>Sistema de Gestão Integrado</p>
          </div>

          {/* Formulário */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Campo Email/Username */}
            <div className="login-form-group">
              <label htmlFor="emailOrUsername">Email ou Utilizador</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="emailOrUsername"
                  type="text"
                  value={emailOrUsername}
                  onChange={handleEmailChange}
                  placeholder="seu@email.com ou utilizador"
                  disabled={isLoading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Campo Password */}
            <div className="login-form-group">
              <label htmlFor="password">Senha</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Digite sua senha"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="login-error" role="alert">
                <span className="error-icon">⚠️</span>
                <div className="error-content">
                  <strong>Erro de Autenticação</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="login-button"
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="login-info">
            <p>🔐 Acesso seguro com autenticação JWT</p>
            <p>📱 Compatível com desktop e mobile</p>
          </div>
        </div>

        {/* Painel Lateral Info */}
        <div className="login-sidebar">
          <h2>Bem-vindo!</h2>
          <div className="feature">
            <div className="feature-icon">📊</div>
            <h3>Dashboard Completo</h3>
            <p>Acompanhe as finanças em tempo real</p>
          </div>
          <div className="feature">
            <div className="feature-icon">👥</div>
            <h3>Controle de Papéis</h3>
            <p>Permissões baseadas em papéis</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔒</div>
            <h3>Segurança</h3>
            <p>Isolamento de dados por Igreja</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📈</div>
            <h3>Relatórios</h3>
            <p>Relatórios detalhados e gráficos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
