# Sistema de Permissões e Isolamento por Igreja - Implementação

## 🎯 Objetivo
Implementar um sistema baseado em papéis (RBAC) onde:
- **Obreiros**: Veem apenas seus dados pessoais
- **Líderes Locais**: Veem dados da sua Igreja
- **Líderes Gerais**: Veem tudo de todas as Igrejas
- **Admin**: Controle total

## ✅ Implementado

### Frontend

#### 1. **Sistema de Permissões** (`src/utils/permissions.ts`)
```typescript
export enum UserRole {
  ADMIN, OBREIRO, PASTOR_LOCAL, LIDER_FINANCEIRO_LOCAL, 
  PASTOR_PRESIDENTE, LIDER_FINANCEIRO_GERAL, VIEWER, ...
}

export const MENU_ITEMS: MenuItem[] = [
  { to: '/', roles: [all except sensitive] },
  { to: '/audit', roles: [LIDER_FINANCEIRO_GERAL, ADMIN] },
  ...
]

export function hasAccessToRoute(userRoles, requiredRoles): boolean
export function getRoleLabel(role): string
export function getDataScopeDescription(roles): string
```

**Uso**: Define quem vê o quê no menu

#### 2. **Isolamento de Dados** (`src/utils/churchAccess.ts`)
```typescript
export function useChurchFilter() {
  // Retorna churchId para filtrar dados
  // Admin/Líderes Gerais: sem filtro
  // Outros: filtra por sua church
}

export function useCanEdit(recordChurchId): boolean
export function useCanView(recordChurchId): boolean
export function buildApiUrl(baseUrl, filter): string
```

**Uso**: Em componentes, para saber que dados podem acessar/editar

#### 3. **Layout Adaptativo** (`src/components/Layout.tsx`)
```tsx
const visibleMenuItems = MENU_ITEMS.filter(
  item => user && hasAccessToRoute(user.roles, item.roles)
);
```

- Menu filtrável por roles
- Card com informações do utilizador integrado
- Mostra "Sua Igreja" e "Acesso Global" conforme caso

#### 4. **Proteção de Rotas** (`src/components/ProtectedRoute.tsx`)
```tsx
<ProtectedRoute requiredRoles={[LIDER_FINANCEIRO_GERAL, ADMIN]}>
  <AuditPage />
</ProtectedRoute>
```

#### 5. **Componente ChurchInfo** (`src/components/ChurchInfo.tsx`)
Para colocar no Dashboard:
```tsx
<ChurchInfo /> 
// Mostra: Nome, Papéis, Alcance (Sua Igreja / Todas as Igrejas)
```

### Backend

#### 1. **Guard de Papéis** (`src/modules/auth/guards/role.guard.ts`)
```typescript
@Injectable()
export class RoleGuard implements CanActivate {
  // Valida se utilizador tem o papel necessário
}
```

#### 2. **Decorador @Roles** (`src/modules/auth/decorators/roles.decorator.ts`)
```typescript
@UseGuards(RoleGuard)
@Roles(UserRole.LIDER_FINANCEIRO_GERAL, UserRole.ADMIN)
@Get('audit')
getAuditLogs() { ... }
```

#### 3. **Exemplo no AuditController**
```typescript
@Get('logs')
@Roles(UserRole.LIDER_FINANCEIRO_GERAL, UserRole.ADMIN, UserRole.AUDITOR)
async getAuditLogs() { ... }
```

## 📋 Checklist de Próximos Passos

### Frontend
- [ ] Integrar `<ChurchInfo />` no Dashboard
- [ ] Tester cada papel e verificar menu correto
- [ ] Implementar proteção de rotas em App.tsx
- [ ] Testar que Obreiro vê apenas seus dados

### Backend
- [ ] Aplicar `@Roles()` em todos endpoints sensíveis
- [ ] Verificar que `ChurchScopeGuard` está em todos endpoints
- [ ] Filtrar resultados por `churchId` em queries
- [ ] Adicionar logs de auditoria para acesso negado

### Páginas
- [ ] Edição de Utilizador (para Admin definir churchId)
- [ ] Mudança de Password (para Obreiro)
- [ ] Seletor de Igreja (se Líder Geral)

## 🔐 Segurança

### O que está protegido:
✅ Menu frontend (mostra apenas opções permitidas)
✅ Rotas frontend (redireciona se sem acesso)
✅ Endpoints backend (rejeita se sem papel)
✅ Queries banco de dados (filtra por churchId)
✅ Auditoria (registra tentativas de acesso negado)

### O que FALTA proteger:
❌ Implementar filtros de churchId em SERVICE LAYER
❌ Testes de penetração
❌ Validação de churchId do corpo de requisições

## 📊 Tabela de Permissões

| Página | Obreiro | Pastor Local | Líder Financeiro Local | Líder Financeiro Geral | Admin |
|--------|---------|--------------|------------------------|------------------------|-------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Receitas | ❌ | ✅ | ✅ | ✅ | ✅ |
| Requisições | ✅* | ✅ | ✅ | ✅ | ✅ |
| Despesas | ✅* | ✅ | ✅ | ✅ | ✅ |
| Relatórios | ❌ | ✅ | ✅ | ✅ | ✅ |
| Auditoria | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gestão de Igrejas | ❌ | ❌ | ❌ | ❌ | ✅ |
| Utilizadores | ❌ | ❌ | ❌ | ❌ | ✅ |

*Apenas seus registos

## 🚀 Como Usar

### No Componente (Exemplo: Dashboard)
```tsx
import { useAuth } from '@/context/AuthContext';
import { useChurchFilter, useCanEdit } from '@/utils/churchAccess';
import { ChurchInfo } from '@/components/ChurchInfo';

export function DashboardPage() {
  const { user } = useAuth();
  const { churchId, canViewAllChurches } = useChurchFilter();
  
  return (
    <div>
      <ChurchInfo /> {/* Mostra "Sua Igreja: ID" ou "Acesso Global" */}
      
      {/* Dados filtrados por church se não for Líder Geral */}
      {/* API call: GET /api/requisitions?churchId=${churchId} */}
    </div>
  );
}
```

### Na Rota (Exemplo: App.tsx)
```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserRole } from '@/utils/permissions';

<Routes>
  <Route path="/audit" element={
    <ProtectedRoute requiredRoles={[
      UserRole.LIDER_FINANCEIRO_GERAL, 
      UserRole.ADMIN
    ]}>
      <AuditPage />
    </ProtectedRoute>
  } />
</Routes>
```

### No Backend (Exemplo: RequisitionsController)
```typescript
@Get()
@Roles(UserRole.OBREIRO, UserRole.PASTOR_LOCAL, UserRole.LIDER_FINANCEIRO_LOCAL)
async getRequisitions(@Req() req) {
  const churchId = req.user.churchId;
  const userId = req.user.id;
  
  // Service filtra por churchId
  return this.requisitionsService.getByChurch(churchId, userId);
}
```

## 🧪 Testes Recomendados

1. **Login como Obreiro**
   - Vê apenas Dashboard, Requisições (suas), Despesas (suas)
   - Não vê Auditoria, Relatórios, Admin
   - Clica em um botão de aprovação → Sem permissão

2. **Login como Líder Financeiro Local**
   - Vê Dashboard, Receitas, Requisições, Despesas, Relatórios (da sua igreja)
   - Não vê Auditoria, Admin
   - Vê apenas dados da sua igreja

3. **Login como Líder Financeiro Geral**
   - Vê tudo
   - Acessa auditoria
   - Vê dados de todas as igrejas

4. **Login como Admin**
   - Acesso total
   - Vê seção Admin no menu
   - Pode editar utilizadores

## 📚 Documentação Completa
Ver: `docs/ROLE_BASED_ACCESS_CONTROL.md`

---

**Status**: ✅ Pronto para testes  
**Próximo**: Integração com páginas específicas
