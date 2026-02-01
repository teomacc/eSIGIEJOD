# Sistema de Permissões e Acesso por Papel (RBAC)

## Visão Geral

O sistema agora implementa controle de acesso baseado em papéis (**RBAC - Role-Based Access Control**) com isolamento de dados por Igreja.

## Papéis e Permissões

### 1. **Obreiro** (`OBREIRO`)
- **Alcance de dados**: Apenas seus dados pessoais
- **Acesso a**:
  - ✅ Dashboard (estatísticas pessoais)
  - ✅ Requisições (pode criar e ver suas)
  - ✅ Despesas (vê suas despesas)
  - ❌ Receitas
  - ❌ Auditoria
  - ❌ Relatórios
  - ❌ Administração

### 2. **Líder Financeiro Local** (`LIDER_FINANCEIRO_LOCAL`)
- **Alcance de dados**: Apenas sua Igreja
- **Acesso a**:
  - ✅ Dashboard
  - ✅ Receitas (da sua igreja)
  - ✅ Requisições (aprova, vê todas da sua igreja)
  - ✅ Despesas (da sua igreja)
  - ✅ Relatórios (locais)
  - ❌ Auditoria
  - ❌ Administração

### 3. **Pastor Local** (`PASTOR_LOCAL`)
- **Alcance de dados**: Apenas sua Igreja
- **Acesso**: Igual ao Líder Financeiro Local

### 4. **Pastor Presidente** (`PASTOR_PRESIDENTE`)
- **Alcance de dados**: Apenas sua Igreja
- **Acesso**: Igual ao Líder Financeiro Local + algumas funcionalidades administrativas locais

### 5. **Líder Financeiro Geral** (`LIDER_FINANCEIRO_GERAL`)
- **Alcance de dados**: ✨ **TODAS as Igrejas**
- **Acesso a**:
  - ✅ Dashboard (consolidado de todas)
  - ✅ Receitas (todas as igrejas)
  - ✅ Requisições (todas as igrejas)
  - ✅ Despesas (todas as igrejas)
  - ✅ Relatórios (gerais e por igreja)
  - ✅ Auditoria
  - ✅ Fundos
  - ✅ Transferências
  - ❌ Administração total (apenas alguns módulos)

### 6. **Administrador** (`ADMIN`)
- **Alcance de dados**: ✨ **TUDO**
- **Acesso**: 🔓 Controle total de tudo

## Arquitetura

### Frontend

#### 1. **`utils/permissions.ts`**
Define:
- Enum `UserRole` com todos os papéis
- Array `MENU_ITEMS` e `ADMIN_ITEMS` com permissões de cada item
- Função `hasAccessToRoute()` para verificar acesso
- Função `getRoleLabel()` para descrições legíveis

#### 2. **`utils/churchAccess.ts`**
Hooks para isolamento de dados:
- `useChurchFilter()` - Obtém filtro de churchId baseado no utilizador
- `useCanEdit()` - Verifica se pode editar um registro
- `useCanView()` - Verifica se pode visualizar um registro
- `buildApiUrl()` - Constrói URLs de API com filtro de igreja

#### 3. **`components/Layout.tsx`**
- Filtra menu dinamicamente baseado em roles
- Mostra informações do utilizador com alcance de dados
- Botão de logout integrado

#### 4. **`components/ProtectedRoute.tsx`**
Wrapper para rotas protegidas:
```tsx
<ProtectedRoute requiredRoles={[UserRole.LIDER_FINANCEIRO_GERAL, UserRole.ADMIN]}>
  <AuditPage />
</ProtectedRoute>
```

#### 5. **`components/ChurchInfo.tsx`**
Componente para mostrar no Dashboard:
- Qual é a Igreja do utilizador
- Quais são seus papéis
- Qual é seu alcance de dados

### Backend

#### Mudanças Necessárias

1. **Model User** ✅ Já tem `churchId`

2. **Guards de Permissão** (criar)
   ```typescript
   // church-scope.guard.ts - Já existe
   // Garante que utilizador só acessa dados da sua chiesa
   
   // role.guard.ts - Novo
   // Valida se utilizador tem o role necessário
   ```

3. **Filtros nos Endpoints**
   ```typescript
   // Exemplo: GET /api/requisitions
   // Se Obreiro: retorna apenas suas requisições
   // Se Líder Local: retorna apenas da sua iglesia
   // Se Líder Geral/Admin: retorna tudo (com opção de filtrar)
   ```

4. **Auditoria Automática**
   - Sistema já registra quem fez o quê
   - Integra com churchId automaticamente

## Fluxo de Utilização

### 1. Login
```
User entra email/password
     ↓
Backend retorna { access_token, user: { id, email, roles, churchId } }
     ↓
Frontend armazena em localStorage
     ↓
AuthContext atualiza estado global
     ↓
Layout filtra menu baseado em roles
```

### 2. Acesso a Dados
```
Component precisa de dados (ex: requisições)
     ↓
Usa hook: const { churchId, canViewAllChurches } = useChurchFilter()
     ↓
Chama API: GET /api/requisitions?churchId=${churchId}
     ↓
Backend filtra: WHERE churchId = ? (se não é Líder Geral/Admin)
     ↓
Retorna apenas dados permitidos
```

### 3. Proteção de Rota
```
<ProtectedRoute requiredRoles={[UserRole.AUDITOR]}>
  <AuditPage />
</ProtectedRoute>
     ↓
Se utilizador é AUDITOR ou ADMIN → Mostra página
Se não → Redireciona para Dashboard
```

## Exemplos de Código

### Usar em Componente

```tsx
import { useAuth } from '@/context/AuthContext';
import { useChurchFilter, useCanEdit } from '@/utils/churchAccess';
import { UserRole } from '@/utils/permissions';

export function MinhaComponente() {
  const { user, isAuthenticated } = useAuth();
  const { churchId, canViewAllChurches } = useChurchFilter();
  const canEdit = useCanEdit(recordChurchId);

  // Verificar se tem um papel específico
  const isFinanceLeader = user?.roles.includes(UserRole.LIDER_FINANCEIRO_LOCAL);
  
  // Usar churchId em chamadas de API
  const url = canViewAllChurches
    ? '/api/requisitions'
    : `/api/requisitions?churchId=${churchId}`;
  
  return (
    <div>
      {isFinanceLeader && <button>Aprovar</button>}
      {canEdit && <button>Editar</button>}
    </div>
  );
}
```

### Proteger Rota

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserRole } from '@/utils/permissions';

<Routes>
  <Route path="/audit" element={
    <ProtectedRoute requiredRoles={[UserRole.LIDER_FINANCEIRO_GERAL, UserRole.ADMIN]}>
      <AuditPage />
    </ProtectedRoute>
  } />
</Routes>
```

### Usar ChurchInfo

```tsx
import { ChurchInfo } from '@/components/ChurchInfo';

export function DashboardPage() {
  return (
    <div>
      <ChurchInfo /> {/* Mostra informações da igreja */}
      {/* resto do dashboard */}
    </div>
  );
}
```

## Backend - Implementação de Filtros

### Exemplo: RequisitionsService

```typescript
async getRequisitions(
  churchId: string,
  userId: string,
  roles: string[],
  filters?: { limit?: number, offset?: number }
) {
  const query = this.requisitionRepository.createQueryBuilder('req');
  
  // Filtro base por churchId
  query.where('req.churchId = :churchId', { churchId });
  
  // Se Obreiro, filtrar apenas suas requisições
  if (roles.includes(UserRole.OBREIRO)) {
    query.andWhere('req.createdBy = :userId', { userId });
  }
  
  // Aplicar pagination
  if (filters?.limit) query.limit(filters.limit);
  if (filters?.offset) query.offset(filters.offset);
  
  return query.getMany();
}
```

### Exemplo: Guard de Papel

```typescript
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler()
    );
    
    if (!requiredRoles) return true; // Sem requerimento
    
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Do JWT
    
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
```

## Checklist de Implementação

- [x] Sistema de permissões frontend criado
- [x] Layout filtrando menu por roles
- [x] ChurchInfo component para Dashboard
- [x] Hooks para isolamento de dados (churchAccess.ts)
- [x] ProtectedRoute component
- [ ] Implementar Guard de Papel no Backend
- [ ] Adicionar filtros de churchId em todos endpoints
- [ ] Testar acesso de cada papel
- [ ] Documentação de edição de utilizadores (para admin)
- [ ] Página de mudança de password
- [ ] Testes de isolamento de dados

## Próximos Passos

1. **Backend**: Criar guards e filtros por churchId
2. **Frontend**: Integrar ChurchInfo no Dashboard
3. **UI**: Adicionar página de Edição de Utilizadores
4. **Password**: Implementar mudança de password (Obreiro)
5. **Testes**: Validar isolamento de dados

---

**Nota**: O sistema respeita automaticamente o churchId em todas as operações. Não é preciso passar manualmente em cada chamada de API se implementado corretamente.
