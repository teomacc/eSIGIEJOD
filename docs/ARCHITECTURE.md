# ARCHITECTURE.md - eSIGIEJOD

Documentação detalhada da arquitetura do sistema

## 🏗️ Visão Geral da Arquitetura

eSIGIEJOD é um sistema de gestão financeira multi-igreja com foco em compliance, auditoria e aprovações automáticas.

### Stack Tecnológico

**Backend:**
- Node.js + NestJS (framework web)
- PostgreSQL (banco de dados)
- TypeORM (ORM)
- JWT (autenticação)
- Passport (estratégias de auth)

**Frontend:**
- React 18 (UI)
- TypeScript (type safety)
- React Router (navegação)
- Axios (HTTP client)
- Vite (bundler)

**Princípios Arquiteturais:**
1. **Modular**: Separação por domínio de negócio
2. **Multi-tenancy**: Isolamento por iglesia (churchId)
3. **Imutabilidade**: Income e AuditLog são write-once
4. **Compliance**: Auditoria de todas as operações
5. **RBAC**: Controle de acesso por role

## 📦 Módulos Backend

### 1. Auth (Autenticação)

**Responsabilidade**: Gerenciar login, JWT, e sessões

**Entidades:**
- User (email, password hash, churchId, roles, isActive)

**Serviços:**
- AuthService.login(email, password) → JWT token
- AuthService.validateUser(email, password) → User
- AuthService.generateToken(user) → JWT

**Estratégias Passport:**
- JwtStrategy: Validar JWT em Authorization header
- LocalStrategy: Validar email + password

**Fluxo de Login:**
```
1. Client POST /auth/login { email, password }
2. AuthService.validateUser() valida credenciais
3. AuthService.generateToken() cria JWT
4. JWT incluído em todas requisições subsequentes
5. JwtStrategy extrai e valida JWT
```

**Roles (5 níveis):**
- PASTOR: Acesso total
- DIRECTOR: Gestão financeira e requisições
- TREASURER: Operações financeiras
- AUDITOR: Visualizar auditoria
- VIEWER: Apenas dashboards

### 2. Finances (Gestão Financeira)

**Responsabilidade**: Registrar receitas e gerenciar fundos

**Entidades:**
- Fund (name, balance, type, churchId)
- Income (amount, type, fundId, date, recordedBy, NO updatedAt)

**FundType (10 tipos):**
- GENERAL (Geral)
- CONSTRUCTION (Construção)
- MISSIONS (Missões)
- SOCIAL (Social)
- EVENTS (Eventos)
- EMERGENCY (Emergência)
- SPECIAL_PROJECTS (Projetos Especiais)
- YOUTH (Juventude)
- WOMEN (Mulheres)
- MAINTENANCE (Manutenção)

**IncomeType (8 tipos):**
- TITHE (Dízimo)
- OFFERING (Oferta)
- SPECIAL_OFFERING (Oferta Especial)
- DESIGNATED_OFFERING (Oferta Designada)
- MONTHLY_CONTRIBUTION (Contribuição Mensal)
- EXTERNAL_DONATION (Doação Externa)
- INTER_CHURCH_TRANSFER (Transferência Entre Igrejas)
- AUTHORIZED_ADJUSTMENT (Ajuste Autorizado)

**Serviços:**
- FinancesService.recordIncome(data) → Income + Fund.balance
- FinancesService.getFundBalance(fundId) → decimal(15,2)
- FinancesService.getIncomeByPeriod(startDate, endDate) → Income[]

**Padrão de Imutabilidade:**
```typescript
// Income NÃO TEM updatedAt
// Uma vez registrada, não pode ser alterada
// Apenas auditável e visível em relatórios
// Se houver erro, registrar "AUTHORIZED_ADJUSTMENT"
```

**Fluxo de Receita:**
```
1. Treasurer: POST /finances/income { fundId, incomeType, amount }
2. FinancesService valida Fund existe
3. Cria Income (sem atualizar depois)
4. Incrementa Fund.balance transacionalmente
5. Registra AuditLog (INCOME_RECORDED)
6. Retorna Income criada
```

### 3. Requisitions (Requisições de Despesa)

**Responsabilidade**: Ciclo de vida de requisições com aprovações

**Entidades:**
- Requisition (code, state, magnitude, approvedAmount, approvalChain)

**RequisitionState (6 estados):**
- PENDING: Criada, não enviada
- UNDER_REVIEW: Enviada para aprovadores
- APPROVED: Aprovada
- REJECTED: Rejeitada
- EXECUTED: Executada (despesa concretizada)
- CANCELLED: Cancelada

**RequisitionMagnitude (4 níveis):**
- SMALL (até 5.000 MT)
- MEDIUM (5.001 - 20.000 MT)
- LARGE (20.001 - 50.000 MT)
- CRITICAL (> 50.000 MT)

**ExpenseCategory (16 categorias):**
- MATERIALS, PERSONNEL, MAINTENANCE, UTILITIES,
- EQUIPMENT, TRAINING, CONSULTING, TRANSPORTATION,
- MEALS, TRAVEL, OFFICE_SUPPLIES, REPAIRS,
- SOFTWARE, PROFESSIONAL_SERVICES, EVENTS, OTHER

**Serviços:**
- RequisitionsService.createRequisition(data)
- RequisitionsService.submitForReview(id)
- RequisitionsService.approveRequisition(id, approvedAmount?)
- RequisitionsService.rejectRequisition(id, reason)
- RequisitionsService.executeRequisition(id)
- RequisitionsService.cancelRequisition(id)

**Transições Permitidas:**
```
PENDING → UNDER_REVIEW ou CANCELLED
UNDER_REVIEW → APPROVED ou REJECTED ou CANCELLED
APPROVED → EXECUTED ou CANCELLED
REJECTED → (nenhuma, estado final)
EXECUTED → (nenhuma, estado final)
CANCELLED → (nenhuma, estado final)
```

**Fluxo de Requisição:**
```
1. User: POST /requisitions { fundId, category, amount, justification }
   → Magnitude calculada baseado na amount
   → Estado: PENDING
   
2. User: PUT /requisitions/{id}/submit
   → Estado: UNDER_REVIEW
   → ApprovalService determina quem precisa aprovar
   
3. Approver (role apropriado): PUT /requisitions/{id}/approve
   → Valida que tem autoridade para montante
   → Estado: APPROVED
   → Armazena approvedAmount e quem aprovou
   
4. Treasurer: PUT /requisitions/{id}/execute
   → Subtrai approvedAmount do fundo
   → Estado: EXECUTED
   → Cria entry em Expense log

Se rejeitado:
3. Approver: PUT /requisitions/{id}/reject { reason }
   → Estado: REJECTED
   → Armazena motivo para auditoria
```

### 4. Approval (Aprovações Automáticas)

**Responsabilidade**: Determinar quem pode aprovar baseado em montante

**Serviços:**
- ApprovalService.calculateApprovalLevel(amount) → ApprovalLevel
- ApprovalService.canApproveAtLevel(user, level) → boolean
- ApprovalService.getAuthorizedRoles(amount) → Role[]
- ApprovalService.getApprovalChain(amount) → ApprovalLevel[]

**ApprovalLevel (4 níveis):**
- TREASURER (até 5.000 MT)
- DIRECTOR (até 20.000 MT)
- BOARD (até 50.000 MT)
- PASTOR (acima de 50.000 MT)

**Matriz de Autoridade:**
```
Role PASTOR:
  ✅ Pode aprovar montante CRITICAL (> 50k)
  ✅ Pode aprovar montante LARGE (20k-50k)
  ✅ Pode aprovar montante MEDIUM (5k-20k)
  ✅ Pode aprovar montante SMALL (até 5k)

Role DIRECTOR:
  ✅ Pode aprovar montante LARGE (20k-50k)
  ✅ Pode aprovar montante MEDIUM (5k-20k)
  ✅ Pode aprovar montante SMALL (até 5k)

Role TREASURER:
  ✅ Pode aprovar montante SMALL (até 5k)

Role AUDITOR, VIEWER:
  ❌ Não podem aprovar nada
```

**Thresholds (Configurável em .env):**
```
APPROVAL_THRESHOLD_TREASURER = 5000
APPROVAL_THRESHOLD_DIRECTOR = 20000
APPROVAL_THRESHOLD_BOARD = 50000
Acima disso = PASTOR
```

### 5. Audit (Auditoria)

**Responsabilidade**: Log imutável de todas as operações

**Entidades:**
- AuditLog (action, entityId, userId, changes, createdAt, NO updatedAt)

**AuditAction (10 ações):**
- INCOME_RECORDED (Receita registrada)
- REQUISITION_CREATED (Requisição criada)
- REQUISITION_APPROVED (Requisição aprovada)
- REQUISITION_REJECTED (Requisição rejeitada)
- REQUISITION_EXECUTED (Requisição executada)
- REQUISITION_CANCELLED (Requisição cancelada)
- FUND_UPDATED (Fundo atualizado)
- USER_LOGIN (Usuário logou)
- USER_CREATED (Usuário criado)
- SETTINGS_CHANGED (Configurações mudaram)
- REPORT_GENERATED (Relatório gerado)

**Índices (Performance):**
```sql
-- Queries rápidas para auditoria
CREATE INDEX idx_audit_church_date ON audit_log(churchId, createdAt DESC);
CREATE INDEX idx_audit_entity ON audit_log(entityId, entityType);
CREATE INDEX idx_audit_action ON audit_log(action, createdAt DESC);
CREATE INDEX idx_audit_user ON audit_log(userId, createdAt DESC);
```

**Serviços:**
- AuditService.logAction(churchId, userId, action, entityId, changes)
- AuditService.getAuditLogsByChurch(churchId) → AuditLog[]
- AuditService.getAuditLogsForEntity(entityId) → AuditLog[]
- AuditService.getAuditLogsByAction(churchId, action) → AuditLog[]
- AuditService.getAuditLogsByUser(churchId, userId) → AuditLog[]
- AuditService.getAuditLogsByPeriod(churchId, startDate, endDate) → AuditLog[]

**Padrão de Imutabilidade:**
```typescript
// Todos os métodos de leitura
// NENHUM método de update ou delete
// Uma vez registrado, é permanente

// Exemplos de logAction():
await auditService.logAction(
  churchId,
  userId,
  AuditAction.INCOME_RECORDED,
  incomeId,
  'Income',
  {
    before: null,
    after: { amount, fundId, type }
  },
  'Receita registrada'
);
```

### 6. Reports (Relatórios)

**Responsabilidade**: Gerar insights e análises de negócio

**Tipos de Relatório:**

1. **Relatório Mensal**
   - Total de receita do mês
   - Receita por tipo (Dízimo, Oferta, etc)
   - Receita por fundo
   - Requisições do mês (criadas, aprovadas, rejeitadas)
   - Tempo médio de aprovação

2. **Relatório Geral**
   - Período customizável (trimestre, semestre, ano)
   - Agregação de dados
   - Comparação entre períodos

3. **Relatório de Fundo**
   - Balanço atual do fundo
   - Histórico de entradas
   - Distribuição de despesas
   - Tendências

4. **Relatório de Requisições**
   - Requisições por estado
   - Requisições por categoria
   - Valor total por categoria
   - Aprovadores mais ativos

5. **Relatório de Compliance**
   - Atividade por período
   - Ações por tipo
   - Ações por usuário
   - Compliance score

6. **Detecção de Anomalias**
   - Transações incomuns (outliers)
   - Padrões suspeitos
   - Comportamento anômalo
   - **TODO**: Machine Learning

**Serviços:**
- ReportsService.generateMonthlyReport(year, month)
- ReportsService.generateGeneralReport(startDate, endDate)
- ReportsService.generateFundReport(fundId)
- ReportsService.generateRequisitionReport(churchId)
- ReportsService.generateComplianceReport(startDate, endDate)
- ReportsService.detectAnomalies(churchId)

## 🔐 Multi-tenancy (Isolamento por Igreja)

Todos os dados são isolados por `churchId`:

```typescript
// Usuário só vê dados da sua iglesia
const data = await incomeRepository.find({
  where: {
    churchId: req.user.churchId  // Isolamento automático
  }
});

// Requisições de approve também verificam churchId
if (requisition.churchId !== req.user.churchId) {
  throw new ForbiddenException();
}
```

## 🛡️ Segurança

### Autenticação
- JWT tokens com expiração
- Senhas com bcrypt (TODO)
- Refresh tokens (TODO)

### Autorização
- RBAC (Role-Based Access Control)
- Verificação de churchId em cada operação
- GuardsPassport para proteção de rotas

### Validação
- Class-validator para DTO validation
- Sanitização de entrada
- SQL injection protection (TypeORM)

### Auditoria
- Log de todas as operações
- Rastreamento de usuário
- Rastreamento de mudanças
- Imutabilidade de registros críticos

## 📊 Padrões de Dados

### Transações Atômicas

```typescript
// Recording income E incrementando balance em uma transação
async recordIncome(data) {
  return await this.incomeRepository.manager.transaction(async (manager) => {
    // Criar Income
    const income = await manager.save(Income, {...});
    
    // Atualizar Fund.balance
    await manager.increment(Fund, fundId, 'balance', data.amount);
    
    // Ambas operações acontecem ou nenhuma
    return income;
  });
}
```

### Agregação de Dados

```typescript
// QueryBuilder para queries complexas
const result = await this.incomeRepository
  .createQueryBuilder('income')
  .select('income.type', 'type')
  .addSelect('SUM(income.amount)', 'total')
  .where('income.churchId = :churchId', { churchId })
  .groupBy('income.type')
  .getRawMany();
```

### Paginação

```typescript
// Standard limit/offset pagination
GET /requisitions?limit=50&offset=0

// Response
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "pages": 3
  }
}
```

## 🎯 Fluxos de Negócio

### Fluxo de Receita (Income)

```
1. Treasurer acessa POST /finances/income
2. Preenche: fundId, incomeType, amount, date, observations
3. Servidor cria Income (imutável)
4. Servidor incrementa Fund.balance transacionalmente
5. Servidor registra AuditLog (INCOME_RECORDED)
6. Frontend mostra notificação de sucesso
7. Dashboard atualiza balanço de fundo
```

### Fluxo de Requisição (Requisition)

```
1. Director cria requisição: POST /requisitions
   - Estado: PENDING
   - Pode editar/cancelar aqui
   
2. Director envia para aprovação: PUT /requisitions/{id}/submit
   - Estado: UNDER_REVIEW
   - Fica visível para aprovadores
   
3. Approver (role apropriado) aprova:
   PUT /requisitions/{id}/approve
   - Sistema valida autoridade baseado em montante
   - Estado: APPROVED
   - Armazena approvedAmount e approver
   
4. Treasurer executa: PUT /requisitions/{id}/execute
   - Subtrai approvedAmount do fundo
   - Estado: EXECUTED
   - Auditado

Alternativamente:
3. Approver rejeita: PUT /requisitions/{id}/reject { reason }
   - Estado: REJECTED
   - Armazena motivo
   - Director é notificado
```

### Fluxo de Auditoria (Audit)

```
1. Toda operação importante logada em AuditLog
2. Incluindo: action, userId, entityId, changes, timestamp
3. Logs são imutáveis (nenhum update/delete)
4. Auditor pode consultar por:
   - Período
   - Ação
   - Usuário
   - Entidade
5. Relatórios de compliance gerados a partir de logs
```

## 🚀 Escalabilidade Futura

### Melhorias Planejadas

1. **Caching**
   - Redis para cache de relatórios
   - Cache de balanço de fundos

2. **Background Jobs**
   - Bull para processamento assíncrono
   - Geração de relatórios agendados

3. **Machine Learning**
   - Detecção de anomalias
   - Previsão de padrões

4. **Mobile**
   - React Native app
   - Sincronização offline

5. **Notificações**
   - Email de requisições pendentes
   - SMS de alertas críticos
   - Push notifications

6. **Integração**
   - APIs de terceiros (Peseza, etc)
   - Webhooks
   - Exportação/Importação

## 📖 Referências

- NestJS: https://docs.nestjs.com/
- TypeORM: https://typeorm.io/
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/
