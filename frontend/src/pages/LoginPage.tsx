import React from 'react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '@/styles/LoginPage.css';

/**
 * PÁGINA DE LOGIN (LoginPage)
 * 
 * Responsabilidade: Formulário de autenticação
 * 
 * Funcionalidades:
 * - Campo de email
 * - Campo de password
 * - Botão de login
 * - Mensagens de erro
 * - Indicador de carregamento
 * 
 * Fluxo:
 * 1. Usuário entra email e password
 * 2. Submit chama useAuth().login()
 * 3. Se sucesso: Redireciona para /
 * 4. Se erro: Mostra mensagem
 * 
 * TODO:
 * - Validação de formulário
 * - Link "Esqueci senha"
 * - Link "Registrar"
 * - Password strength indicator
 */

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      // Erro já gerenciado pelo useAuth
    }
  }

  return (
    <div className="login-container">
      <h1>Login - eSIGIEJOD</h1>
      
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>

        <div className="login-form-group">
          <label>Senha:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="*****"
          />
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="login-button"
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="login-footer">
        Demo: Use credenciais de teste (implementar após backend)
      </p>
    </div>
  );
}
