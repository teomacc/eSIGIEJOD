import React, { createContext, useContext, useState, useCallback } from 'react';

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
  email: string;
  churchId: string;
  roles: string[];
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: Implementar chamada para API
        // const response = await axios.post('/auth/login', { email, password });
        // const { access_token, user } = response.data;

        // Por enquanto, mock para demonstrar fluxo
        const mockUser: User = {
          id: 'user-1',
          email,
          churchId: 'church-1',
          roles: ['PASTOR'],
          isActive: true,
        };
        const mockToken = 'mock-jwt-token-' + Date.now();

        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
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
   * LOGOUT
   * 
   * Fluxo:
   * 1. Limpar estado local
   * 2. Limpar localStorage
   * 3. (Opcional) Chamar API para invalidar token no servidor
   */
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // TODO: Chamar API POST /auth/logout
  }, []);

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
        logout,
        isAuthenticated,
        hasRole,
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
