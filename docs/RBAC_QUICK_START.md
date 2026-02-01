# 🎓 RBAC - Guia Rápido de Implementação

## O que foi criado?

### 1️⃣ Frontend - Sistema Central de Permissões

**`src/utils/permissions.ts`**
```typescript
// Todos os papéis disponíveis
export enum UserRole {
  ADMIN, OBREIRO, PASTOR_LOCAL, 
  LIDER_FINANCEIRO_LOCAL, LIDER_FINANCEIRO_GERAL, ...
}

// Menu e Admin items com permissões
export const MENU_ITEMS: MenuItem[] = [
  { to: '/', label: 'Dashboard', roles: [...] },
  { to: '/audit', label: 'Auditoria', roles: [LIDER_FINANCEIRO_GERAL, ADMIN] },
  ...
]

// Helper functions
hasAccessToRoute(userRoles, requiredRoles) // true/false
getRoleLabel(role) // "Administrador"
getDataScopeDescription(roles) // "Sua Igreja" ou "Todas as Igrejas"
```

### 2️⃣ Frontend - Isolamento de Dados por Igreja

**`src/utils/churchAccess.ts`**
```typescript
// No seu componente:
const { churchId, canViewAllChurches } = useChurchFilter();
// Se Obreiro: churchId = "uuid-da-sua-igreja"
// Se Líder Geral: churchId = undefined (sem filtro)

// Verificar se pode editar
const canEdit = useCanEdit(recordChurchId);

// Construir URL com filtro automático
const url = buildApiUrl('/api/requisitions', churchFilter);
// Retorna: '/api/requisitions?churchId=...' ou '/api/requisitions'
```

### 3️⃣ Frontend - Layout Adaptativo

**`src/components/Layout.tsx`**
- ✅ Menu filtrável por roles
- ✅ Card com informações do utilizador
- ✅ Mostra "Sua Igreja: xxx" ou "Acesso Global"
- ✅ Botão de logout

### 4️⃣ Frontend - Proteção de Rotas

**`src/components/ProtectedRoute.tsx`**
```tsx
<ProtectedRoute requiredRoles={[UserRole.LIDER_FINANCEIRO_GERAL]}>
  <AuditPage />
</ProtectedRoute>
// Se sem acesso → redireciona para Dashboard
```

### 5️⃣ Frontend - Componente de Informação

**`src/components/ChurchInfo.tsx`**
- Mostra nome do utilizador
- Mostra papéis (Administrador, Obreiro, etc)
- Mostra alcance (Sua Igreja / Global)
- Aviso se não tiver churchId designada

### 6️⃣ Backend - Validação de Papéis

**`src/modules/auth/guards/role.guard.ts`**
```typescript
@UseGuards(RoleGuard)
@Roles(UserRole.ADMIN, UserRole.LIDER_FINANCEIRO_GERAL)
@Get('/sensitive-data')
async getSensitiveData() { ... }
// RoleGuard valida se utilizador tem um dos papéis
```

**`src/modules/auth/decorators/roles.decorator.ts`**
```typescript
@Roles(UserRole.ADMIN) // Define papéis requeridos
```

---

## 📊 Matriz de Acesso Rápida

```
┌─────────────────────┬──────────┬───────┬──────────┬────────────┬───────┐
│ Página              │ Obreiro  │ Pastor│ L.Fin.L  │ L.Fin.Geral│ Admin │
├─────────────────────┼──────────┼───────┼──────────┼────────────┼───────┤
│ Dashboard           │ ✅ Você  │ ✅ Sua│ ✅ Sua   │ ✅ Todas   │ ✅    │
│ Receitas            │ ❌       │ ✅ Sua│ ✅ Sua   │ ✅ Todas   │ ✅    │
│ Requisições         │ ✅ Suas  │ ✅ Sua│ ✅ Sua   │ ✅ Todas   │ ✅    │
│ Despesas            │ ✅ Suas  │ ✅ Sua│ ✅ Sua   │ ✅ Todas   │ ✅    │
│ Relatórios          │ ❌       │ ✅ Sua│ ✅ Sua   │ ✅ Globais │ ✅    │
│ Auditoria           │ ❌       │ ❌    │ ❌       │ ✅         │ ✅    │
│ Gestão de Igrejas   │ ❌       │ ❌    │ ❌       │ ❌         │ ✅    │
│ Utilizadores        │ ❌       │ ❌    │ ❌       │ ❌         │ ✅    │
└─────────────────────┴──────────┴───────┴──────────┴────────────┴───────┘
```

---

## 🚀 Como Integrar Agora?

### Passo 1: No Dashboard
```tsx
import { ChurchInfo } from '@/components/ChurchInfo';

export function DashboardPage() {
  return (
    <div className="dashboard">
      <ChurchInfo /> {/* Adicione isto aqui */}
      {/* resto do dashboard */}
    </div>
  );
}
```

### Passo 2: Nas Rotas (App.tsx)
```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserRole } from '@/utils/permissions';

<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<DashboardPage />} />
    
    <Route path="audit" element={
      <ProtectedRoute requiredRoles={[
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.ADMIN,
        UserRole.AUDITOR
      ]}>
        <AuditPage />
      </ProtectedRoute>
    } />
    
    <Route path="requisitions" element={
      <ProtectedRoute requiredRoles={[
        UserRole.OBREIRO,
        UserRole.PASTOR_LOCAL,
        UserRole.LIDER_FINANCEIRO_LOCAL,
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.ADMIN
      ]}>
        <RequisitionsPage />
      </ProtectedRoute>
    } />
  </Route>
</Routes>
```

### Passo 3: Em Componentes que Precisam de Dados
```tsx
import { useChurchFilter } from '@/utils/churchAccess';

export function RequisitionsPage() {
  const { churchId, canViewAllChurches } = useChurchFilter();
  
  const fetchRequisitions = async () => {
    const url = canViewAllChurches 
      ? '/api/requisitions'
      : `/api/requisitions?churchId=${churchId}`;
    
    const response = await fetch(url);
    // ...
  };
  
  return (
    <div>
      {/* componentes aqui */}
    </div>
  );
}
```

### Passo 4: Backend - Proteger Endpoints
```typescript
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Get('logs')
@Roles(UserRole.LIDER_FINANCEIRO_GERAL, UserRole.ADMIN)
async getAuditLogs(@Req() req) {
  // RoleGuard garante que tem papel
  // ChurchScopeGuard garante que não acessa outra igreja
  return this.auditService.getLogs(req.user.churchId);
}
```

---

## ✅ Checklist Final

- [x] Sistema de permissões criado (`permissions.ts`)
- [x] Isolamento de dados por igreja criado (`churchAccess.ts`)
- [x] Layout adaptativo implementado
- [x] Componente ProtectedRoute pronto
- [x] Componente ChurchInfo pronto
- [x] Backend RoleGuard implementado
- [x] Decorador @Roles criado
- [x] Exemplo no AuditController
- [ ] Integrar nos outros endpoints (Requisições, Despesas, etc)
- [ ] Integrar ChurchInfo no Dashboard
- [ ] Proteger rotas em App.tsx
- [ ] Testar cada papel

---

## 📚 Documentação Completa

Consulte:
- `docs/ROLE_BASED_ACCESS_CONTROL.md` - Documentação técnica completa
- `docs/IMPLEMENTATION_RBAC.md` - Guia passo-a-passo
- `RBAC_SUMMARY.md` - Resumo de implementação

---

**Pronto para usar! 🚀**
