/**
 * SISTEMA DE PERMISSÕES E ACESSO POR PAPEL
 * 
 * Define quais páginas/funcionalidades cada role pode acessar
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  OBREIRO = 'OBREIRO',
  PASTOR_LOCAL = 'PASTOR_LOCAL',
  LIDER_FINANCEIRO_LOCAL = 'LIDER_FINANCEIRO_LOCAL',
  PASTOR_PRESIDENTE = 'PASTOR_PRESIDENTE',
  LIDER_FINANCEIRO_GERAL = 'LIDER_FINANCEIRO_GERAL',
  VIEWER = 'VIEWER',
  // Legado
  PASTOR = 'PASTOR',
  DIRECTOR = 'DIRECTOR',
  TREASURER = 'TREASURER',
  AUDITOR = 'AUDITOR',
}

export interface MenuItem {
  to: string;
  label: string;
  icon: string;
  roles: UserRole[]; // Quais roles podem ver este item
}

/**
 * ITENS DE MENU DISPONÍVEIS
 * Cada item especifica quais roles têm acesso
 */
export const MENU_ITEMS: MenuItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: '📊',
    // Todos podem ver (dados serão filtrados por churchId)
    roles: [
      UserRole.OBREIRO,
      UserRole.PASTOR_LOCAL,
      UserRole.LIDER_FINANCEIRO_LOCAL,
      UserRole.PASTOR_PRESIDENTE,
      UserRole.LIDER_FINANCEIRO_GERAL,
      UserRole.ADMIN,
      UserRole.DIRECTOR,
      UserRole.TREASURER,
      UserRole.AUDITOR,
      UserRole.VIEWER,
    ],
  },
  {
    to: '/receitas',
    label: 'Receitas',
    icon: '💰',
    // Finanças: Líder Financeiro Local, Pastor, Líderes Gerais
    roles: [
      UserRole.PASTOR_LOCAL,
      UserRole.LIDER_FINANCEIRO_LOCAL,
      UserRole.PASTOR_PRESIDENTE,
      UserRole.LIDER_FINANCEIRO_GERAL,
      UserRole.ADMIN,
      UserRole.DIRECTOR,
      UserRole.TREASURER,
    ],
  },
  {
    to: '/requisitions',
    label: 'Requisições',
    icon: '📝',
    // Todos podem ver/criar requisições (Obreiro cria, líderes aprovam)
    roles: [
      UserRole.OBREIRO,
      UserRole.PASTOR_LOCAL,
      UserRole.LIDER_FINANCEIRO_LOCAL,
      UserRole.PASTOR_PRESIDENTE,
      UserRole.LIDER_FINANCEIRO_GERAL,
      UserRole.ADMIN,
      UserRole.DIRECTOR,
      UserRole.TREASURER,
    ],
  },
  {
    to: '/despesas',
    label: 'Despesas',
    icon: '💸',
    // Obreiro vê suas despesas, líderes veem da sua igreja
    roles: [
      UserRole.OBREIRO,
      UserRole.PASTOR_LOCAL,
      UserRole.LIDER_FINANCEIRO_LOCAL,
      UserRole.PASTOR_PRESIDENTE,
      UserRole.LIDER_FINANCEIRO_GERAL,
      UserRole.ADMIN,
      UserRole.DIRECTOR,
      UserRole.TREASURER,
    ],
  },
  {
    to: '/audit',
    label: 'Auditoria',
    icon: '🕵️',
    // Apenas líderes gerais e admin
    roles: [
      UserRole.LIDER_FINANCEIRO_GERAL,
      UserRole.ADMIN,
      UserRole.AUDITOR,
    ],
  },
  {
    to: '/reports',
    label: 'Relatórios',
    icon: '📑',
    // Líderes locais/gerais e admin
    roles: [
      UserRole.PASTOR_LOCAL,
      UserRole.LIDER_FINANCEIRO_LOCAL,
      UserRole.PASTOR_PRESIDENTE,
      UserRole.LIDER_FINANCEIRO_GERAL,
      UserRole.ADMIN,
      UserRole.DIRECTOR,
      UserRole.TREASURER,
    ],
  },
];

/**
 * ITENS DE ADMINISTRAÇÃO
 * Apenas para papéis administrativos
 */
export const ADMIN_ITEMS: MenuItem[] = [
  {
    to: '/igrejas',
    label: 'Gestão de Igrejas',
    icon: '🏛️',
    roles: [UserRole.ADMIN, UserRole.DIRECTOR],
  },
  {
    to: '/utilizadores',
    label: 'Utilizadores',
    icon: '👥',
    roles: [UserRole.ADMIN, UserRole.DIRECTOR],
  },
  {
    to: '/fundos',
    label: 'Fundos',
    icon: '🏦',
    roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.LIDER_FINANCEIRO_GERAL],
  },
  {
    to: '/configuracoes',
    label: 'Configurações Globais',
    icon: '⚙️',
    roles: [UserRole.ADMIN],
  },
  {
    to: '/transferencias',
    label: 'Transferências',
    icon: '🔁',
    roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.LIDER_FINANCEIRO_GERAL],
  },
];

/**
 * Verificar se role tem acesso a uma rota
 */
export function hasAccessToRoute(userRoles: string[], requiredRoles: UserRole[]): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // Admin tem acesso a tudo
  if (userRoles.includes(UserRole.ADMIN)) {
    return true;
  }

  // Verificar se algum dos roles do utilizador está na lista de required roles
  return userRoles.some((role) => requiredRoles.includes(role as UserRole));
}

/**
 * Obter descrição legível do role
 */
export function getRoleLabel(role: string): string {
  const labels: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.OBREIRO]: 'Obreiro',
    [UserRole.PASTOR_LOCAL]: 'Pastor Local',
    [UserRole.LIDER_FINANCEIRO_LOCAL]: 'Líder Financeiro Local',
    [UserRole.PASTOR_PRESIDENTE]: 'Pastor Presidente',
    [UserRole.LIDER_FINANCEIRO_GERAL]: 'Líder Financeiro Geral',
    [UserRole.VIEWER]: 'Visualizador',
    [UserRole.PASTOR]: 'Pastor',
    [UserRole.DIRECTOR]: 'Diretor',
    [UserRole.TREASURER]: 'Tesoureiro',
    [UserRole.AUDITOR]: 'Auditor',
  };

  return labels[role as UserRole] || role;
}

/**
 * Obter descrição de alcance de dados por role
 */
export function getDataScopeDescription(roles: string[]): string {
  if (roles.includes(UserRole.LIDER_FINANCEIRO_GERAL) || roles.includes(UserRole.ADMIN)) {
    return 'Acesso a todas as igrejas';
  }

  if (roles.includes(UserRole.PASTOR_LOCAL) || roles.includes(UserRole.LIDER_FINANCEIRO_LOCAL)) {
    return 'Dados da sua igreja local';
  }

  if (roles.includes(UserRole.OBREIRO)) {
    return 'Seus dados pessoais';
  }

  return 'Acesso restrito';
}
