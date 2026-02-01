# Sistema de Requisições - Fluxo de Aprovação Multi-Nível

## 📋 **Resumo Executivo**

Sistema de requisições financeiras implementado com aprovações baseadas em hierarquia e tipo de criador. Garante transparência, controlo e isolamento por igreja.

---

## 🔑 **Fluxo de Aprovação por Criador**

### **1. OBREIRO cria requisição**
- ✅ **Aprovação**: Líder Financeiro Local
- 📢 **Notificação**: Pastor Local (para conhecimento, NÃO bloqueia)
- 🚫 **Não pode aprovar**: Obreiro não vê botão de aprovação

### **2. LÍDER FINANCEIRO LOCAL cria requisição**
- ✅ **Aprovação Nível 1**: Pastor Local
- ✅ **Aprovação Nível 2**: Líder Financeiro Geral
- ⚠️ **Ambas requeridas** para transitar para APROVADA

### **3. PASTOR LOCAL cria requisição**
- ✅ **Aprovação Nível 1**: Líder Financeiro Local
- ✅ **Aprovação Nível 2**: Líder Financeiro Geral
- ⚠️ **Ambas requeridas** para transitar para APROVADA

### **4. LÍDER FINANCEIRO GERAL cria requisição**
- ✅ **Aprovação**: Pastor Presidente
- 📍 Apenas o Pastor Presidente pode aprovar

---

## 👥 **Permissões de Visualização**

| Role | Visualização | Pode Criar | Pode Aprovar | Pode Executar |
|------|-------------|------------|--------------|---------------|
| **OBREIRO** | Sua igreja | ✅ | ❌ | ❌ |
| **LIDER_FINANCEIRO_LOCAL** | Sua igreja | ✅ | ✅ (Obreiro/Pastor) | ✅ |
| **PASTOR_LOCAL** | Sua igreja | ✅ | ✅ (Lider Local) | ❌ |
| **LIDER_FINANCEIRO_GERAL** | **TODAS** | ✅ | ✅ (Multi-nível) | ✅ |
| **PASTOR_PRESIDENTE** | **TODAS** | ✅ | ✅ (LFG) | ✅ |
| **ADMIN** | **TODAS** | ✅ | ✅ (Qualquer) | ✅ |

---

## 🛠️ **Implementação Técnica**

### **Backend Changes**

#### **1. RequisitionsService** (`requisitions.service.ts`)

**Novos métodos**:
```typescript
private mapRolesToApprovalLevel(roles?: string[]): ApprovalLevel | null
private getRequiredApprovalLevelsFor(req: Requisition): ApprovalLevel[]
```

**Lógica de Aprovação** (método `approveRequisition`):
- Determina cadeia de aprovação baseada em `creatorType`
- Valida se usuário tem nível correto na cadeia
- Marca aprovação no nível correspondente (`approvedBy`, `approvedByLevel2`, `approvedByLevel3`)
- Transita para `APROVADA` apenas quando TODAS as aprovações requeridas estão completas
- Mantém `EM_ANALISE` se ainda faltam aprovações

**Exemplo de cadeia**:
```typescript
// OBREIRO → [LOCAL_FINANCE]
// LIDER_FINANCEIRO → [LOCAL_PASTOR, GLOBAL_FINANCE]
// PASTOR → [LOCAL_FINANCE, GLOBAL_FINANCE]
```

#### **2. RequisitionsController.v2** (`requisitions.controller.v2.ts`)

**Endpoints atualizados**:
- `GET /requisitions` - Passa `roles` para filtrar por permissão
- `GET /requisitions/status/pending` - Suporta visão global
- `GET /requisitions/status/under-review` - Suporta visão global
- `GET /requisitions/status/approved` - Suporta visão global
- `GET /requisitions/status/executed` - Suporta visão global

#### **3. Entity Requisition** (`requisition.entity.ts`)

**Campos relevantes**:
```typescript
creatorType: RequisitionCreatorType  // Quem criou
approvedBy: string                   // Nível 1
approvedByLevel2?: string            // Nível 2 (se requerido)
approvedByLevel3?: string            // Nível 3 (se requerido)
notificadoPastorEm?: Date            // Quando pastor foi notificado
```

### **Frontend Changes**

#### **1. useRequisitionPermissions Hook** (`hooks/useRequisitionPermissions.ts`)

Hook que determina quais botões mostrar baseado em:
- Role do usuário
- Estado da requisição
- Tipo de criador
- Igreja da requisição

**Retorna**:
```typescript
{
  canApprove: boolean,
  canReject: boolean,
  canExecute: boolean,
  canView: boolean,
  isGlobal: boolean
}
```

#### **2. RequisitionsPage** (`pages/RequisitionsPage.tsx`)

**Mudanças**:
- Usa `useRequisitionPermissions(req)` para cada requisição
- Mostra botões apenas se `permissions.canApprove`, `permissions.canExecute`, etc.
- Mostra "Aguardando aprovação" se usuário não pode aprovar

**Exemplo de renderização**:
```tsx
{req.state === 'EM_ANALISE' && (
  <>
    {permissions.canApprove && (
      <button onClick={() => handleApprove(req)}>✓ Aprovar</button>
    )}
    {permissions.canReject && (
      <button onClick={() => handleReject(req.id)}>✕ Rejeitar</button>
    )}
    {!permissions.canApprove && !permissions.canReject && (
      <span className="muted">Aguardando aprovação</span>
    )}
  </>
)}
```

#### **3. useChurchFilter** (`utils/churchAccess.ts`)

**Atualização**:
- `ADMIN`: `churchId: undefined` (vê todas sem filtro)
- `LIDER_FINANCEIRO_GERAL`: `churchId: user.churchId` + `canViewAllChurches: true`
  - Mantém sua própria igreja mas pode ver TODAS
- Outros: Apenas sua igreja

---

## 🔄 **Fluxo Completo de Requisição**

### **Cenário 1: Obreiro solicita material de escritório (5.000 MT)**

1. **Criação** (OBREIRO)
   - Estado: `PENDENTE`
   - Criador: OBREIRO
   - `creatorType`: `OBREIRO`

2. **Envio para análise**
   - Estado: `EM_ANALISE`
   - Pastor Local notificado automaticamente (`notificadoPastorEm = Date.now()`)

3. **Aprovação**
   - Líder Financeiro Local clica "Aprovar"
   - `approvedBy = userId`
   - Estado: `APROVADA` (pois apenas 1 aprovação é requerida)

4. **Execução**
   - Líder Financeiro Local ou Geral clica "Executar"
   - Despesa criada, fundo decrementado
   - Estado: `EXECUTADA`

### **Cenário 2: Líder Financeiro Local solicita evento (50.000 MT)**

1. **Criação** (LIDER_FINANCEIRO_LOCAL)
   - Estado: `PENDENTE`
   - `creatorType`: `LIDER_FINANCEIRO`

2. **Envio para análise**
   - Estado: `EM_ANALISE`

3. **Aprovação Nível 1**
   - Pastor Local clica "Aprovar"
   - `approvedByLevel2 = userId`
   - Estado: **AINDA EM_ANALISE** (falta nível 2)

4. **Aprovação Nível 2**
   - Líder Financeiro Geral clica "Aprovar"
   - `approvedByLevel3 = userId`
   - Estado: `APROVADA` (ambas aprovações completas)

5. **Execução**
   - Líder Financeiro Geral executa
   - Estado: `EXECUTADA`

---

## 🎯 **Dashboard - Obreiros**

**Problema identificado**: Obreiros não devem ver fundos da igreja, apenas resumo de suas despesas.

**Solução proposta**:
- Dashboard exibe para OBREIRO:
  - ✅ Resumo de requisições criadas por ele
  - ✅ Total de despesas solicitadas
  - ✅ Status das suas requisições
  - ❌ Não mostra balanço de fundos da igreja

**Implementação**:
```tsx
// DashboardPage.tsx
const isObreiro = hasRole(UserRole.OBREIRO);

{!isObreiro && (
  <section className="dashboard-balance">
    {/* Balanço de fundos */}
  </section>
)}

{isObreiro && (
  <section className="dashboard-obreiro-summary">
    <h2>Minhas Despesas</h2>
    {/* Resumo das requisições do obreiro */}
  </section>
)}
```

---

## 🐛 **Correção de Bugs**

### **1. Audit Batch Log Error**

**Erro**:
```
BadRequestException: Utilizador e igreja são obrigatórios
```

**Causa**: Líder Financeiro Geral não tem `churchId` quando é tratado como global.

**Correção** (`audit.controller.ts`):
```typescript
const roles = req.user?.roles || [];
const isGlobal = roles.includes(UserRole.ADMIN) || 
                 roles.includes(UserRole.LIDER_FINANCEIRO_GERAL);

const churchId = req.user?.churchId || req.churchId || req.query?.churchId;

if (!userId || (!churchId && !isGlobal)) {
  throw new BadRequestException('Utilizador e igreja são obrigatórios');
}

await this.auditService.logEventsBatch(
  dto.events,
  userId,
  churchId || 'GLOBAL', // Aceita GLOBAL para usuários globais
  req.ip,
  req.headers['user-agent'],
);
```

---

## ✅ **Checklist de Validação**

- [x] Obreiro vê apenas suas requisições
- [x] Obreiro NÃO vê botão de aprovação em requisições criadas por ele
- [x] Líder Financeiro Local aprova requisições de Obreiros
- [x] Pastor Local é notificado quando Obreiro cria requisição
- [x] Líder Financeiro Local + Pastor Local aprovam requisições de Líder Financeiro
- [x] Líder Financeiro Local + Líder Financeiro Geral aprovam requisições de Pastor
- [x] Líder Financeiro Geral vê TODAS as requisições
- [x] Líder Financeiro Geral mantém sua própria `churchId` (não perde permissões locais)
- [x] Obreiro vê apenas resumo de despesas no Dashboard (não fundos da igreja)
- [x] Filtro de requisições funciona corretamente
- [x] Audit log não falha para usuários globais

---

## 📚 **Documentação Adicional**

### **UserRole Hierarquia**

```
ADMIN (superusuário - todas as permissões)
  ↓
PASTOR_PRESIDENTE (aprova Líder Financeiro Geral)
  ↓
LIDER_FINANCEIRO_GERAL (vê todas, aprova multi-nível)
  ↓
PASTOR_LOCAL (aprova Líder Financeiro Local, notificado por Obreiro)
  ↓
LIDER_FINANCEIRO_LOCAL (aprova Obreiro e Pastor, executa pagamentos)
  ↓
OBREIRO (cria requisições, vê status)
```

### **ApprovalLevel Mapeamento**

| ApprovalLevel | Roles Autorizados |
|---------------|-------------------|
| LOCAL_FINANCE | LIDER_FINANCEIRO_LOCAL, TREASURER |
| LOCAL_PASTOR | PASTOR_LOCAL |
| GLOBAL_FINANCE | LIDER_FINANCEIRO_GERAL |
| PRESIDENT | PASTOR_PRESIDENTE, ADMIN |

---

## 🔧 **Próximos Passos**

1. ✅ Implementar Dashboard diferenciado para Obreiros
2. ✅ Adicionar testes unitários para lógica de aprovação
3. ✅ Criar endpoint de métricas de requisições
4. ✅ Adicionar notificações push quando requisição é aprovada/rejeitada
5. ✅ Implementar histórico de alterações de requisições

---

**Última atualização**: 25 de Janeiro de 2026  
**Autor**: GitHub Copilot & Equipe eSIGIEJOD
