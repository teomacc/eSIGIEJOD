import React, { createContext, useContext, useState, useCallback } from 'react';
import { auditService } from '@/services/auditService';

/**
 * CONTEXTO DE AUTENTICAÇÃO (AuthContext)
 * 
 * Responsabilidade: Gerenciar estado global de autenticação
 * 
 * Estado:
 * - user: Usuário autenticado (null se não autenticado)
 * - token: JWT token
 * - isLoading: Carregando login
 * - error: Mensagem de erro
 * 
 * Métodos:
 * - login(email, password): Autenticar
 * - logout(): Desautenticar
 * - isAuthenticated: Verificar se autenticado
 * - hasRole(role): Verificar se tem role
 * 
 * Uso:
 * const { user, login, logout, isAuthenticated } = useAuth();
 * 
 * Interface de Usuário:
 * {
 *   id: string,
 *   email: string,
 *   churchId: string,
 *   roles: string[],
 *   isActive: boolean
 * }
 */

interface User {
  id: string;
  email?: string;
  username?: string;
  churchId: string;
  roles: string[];
  isActive: boolean;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  activeChurchContext: string | null;
  setActiveChurchContext: (churchId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * PROVEDOR DE AUTENTICAÇÃO (AuthProvider)
 * 
 * Envolve a aplicação para disponibilizar autenticação
 * 
 * Fluxo de Login:
 * 1. Usuário entra email e password
 * 2. Provider chama API POST /auth/login
 * 3. API retorna { access_token: "...", user: { ... } }
 * 4. Provider armazena token no localStorage
 * 5. Provider atualiza estado (user, token)
 * 6. Componentes filhos recebem novo estado
 * 7. Rotas protegidas verificam isAuthenticated
 * 
 * Persistência:
 * - Token salvo no localStorage
 * - Na inicialização, Provider tenta recuperar token
 * 
 * TODO: Implementar refresh token
 * TODO: Implementar auto-logout ao expirar
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Contexto de igreja ativa (para LIDER_FINANCEIRO_GERAL escolher entre sua igreja local ou conta GERAL)
  const [activeChurchContext, setActiveChurchContextState] = useState<string | null>(() => {
    const stored = localStorage.getItem('activeChurchContext');
    return stored || (user?.churchId || null);
  });

  const setActiveChurchContext = useCallback((churchId: string) => {
    setActiveChurchContextState(churchId);
    localStorage.setItem('activeChurchContext', churchId);
  }, []);

  /**
   * LOGIN
   * 
   * Fluxo:
   * 1. Validar que email e password não estão vazios
   * 2. Chamar API POST /auth/login { email, password }
   * 3. API retorna { access_token, user }
   * 4. Extrair token e user da resposta
   * 5. Salvar token no localStorage
   * 6. Atualizar estado
   * 
   * Erros possíveis:
   * - Credenciais inválidas
   * - Servidor indisponível
   * - Network error
   */
  const login = useCallback(
    async (emailOrUsername: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Validar entrada
        if (!emailOrUsername.trim() || !password) {
          throw new Error('Email/Utilizador e senha são obrigatórios');
        }

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emailOrUsername: emailOrUsername.trim(),
            password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
            (response.status === 401 ? 'Email/Utilizador ou senha incorretos' : 'Erro ao fazer login')
          );
        }

        const { access_token, user } = await response.json();

        setUser(user);
        setToken(access_token);
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Registar login na auditoria
        auditService.logLogin(user.email || user.username);
      } catch (err: any) {
        setError(err.message || 'Erro ao fazer login');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * REGISTER - Registar novo usuário
   * 
   * Fluxo:
   * 1. Chamar API POST /auth/register
   * 2. Apenas DIRECTOR e TREASURER podem registar
   * 3. Se sucesso: Login automático do novo usuário
   * 4. Se erro: Mostrar mensagem
   */
  const register = useCallback(
    async (userData: any) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao registar usuário');
        }

        const newUser = await response.json();
        setError(null);
        // Não fazer login automático, apenas registar
      } catch (err: any) {
        setError(err.message || 'Erro ao registar usuário');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  /**
   * LOGOUT
   * 
   * Fluxo:
   * 1. Limpar estado local
   * 2. Limpar localStorage
   * 3. (Opcional) Chamar API para invalidar token no servidor
   */
  const logout = useCallback(() => {
    // Registar logout na auditoria antes de limpar
    if (user) {
      auditService.logLogout();
    }

    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // TODO: Chamar API POST /auth/logout
  }, [user]);

  /**
   * VERIFICAR SE AUTENTICADO
   */
  const isAuthenticated = !!token && !!user;

  /**
   * VERIFICAR SE TEM ROLE
   * 
   * Exemplo: hasRole('PASTOR')
   * Retorna true se usuário tem role PASTOR
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return user?.roles.includes(role) || false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        isAuthenticated,
        hasRole,
        activeChurchContext,
        setActiveChurchContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * HOOK DE AUTENTICAÇÃO (useAuth)
 * 
 * Uso em componentes:
 * function MyComponent() {
 *   const { user, login, logout, isAuthenticated } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginPage />;
 *   }
 *   
 *   return <div>Bem-vindo {user?.email}</div>;
 * }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
