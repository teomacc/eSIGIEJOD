# Sistema de Auditoria Completo - Documentação

## 📋 Visão Geral

Sistema de auditoria abrangente que registra **TODOS** os eventos do utilizador - desde cliques até movimentos de mouse - com armazenamento imutável na base de dados.

**Objetivo**: Rastreamento granular de ações com conformidade regulatória total.

---

## 🏗️ Arquitetura

```
┌─────────────────────┐
│  Frontend (React)   │
│  ┌───────────────┐  │
│  │ AuditService  │  │ Interceta eventos globais
│  │  - Click      │  │
│  │  - Form       │  │
│  │  - Type       │  │
│  │  - Scroll     │  │
│  │  - Mouse Move │  │
│  │  - Errors     │  │
│  └───────────────┘  │
└──────────┬──────────┘
           │
        Batch Event
        Queue (5s)
           │
           ▼
┌─────────────────────┐
│   Backend (NestJS)  │
│ POST /audit/logs    │
│  logEventsBatch()   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   PostgreSQL DB     │
│  audit_logs table   │
│  (Immutable)        │
└─────────────────────┘
```

---

## 🎯 Eventos Auditados

### Login/Logout
- ✅ `USER_LOGIN` - Regista email, hora, IP, user-agent
- ✅ `USER_LOGOUT` - Calcula duração da sessão

### Navegação
- ✅ `PAGE_NAVIGATION` - URL anterior/atual
- ✅ `PAGE_HIDDEN` - Abas/janelas minimizadas
- ✅ `PAGE_VISIBLE` - Retorno à aba

### Interação do Utilizador
- ✅ `ELEMENT_CLICKED` - Elemento, classes, ID
- ✅ `FORM_SUBMITTED` - Nome do formulário
- ✅ `USER_TYPING` - Campo de input
- ✅ `PAGE_SCROLLED` - Posição (X, Y)
- ✅ `MOUSE_MOVEMENT` - Coordenadas (throttled 2s)

### Operações
- ✅ `INCOME_RECORDED` - Receita registada
- ✅ `REQUISITION_APPROVED` - Requisição aprovada
- ✅ `CHURCH_CREATED` - Igreja criada
- ✅ E muitos mais...

### Erros
- ✅ `ERROR_OCCURRED` - Exceções JavaScript

---

## 💾 Estrutura de Dados

### AuditLog Entity (Backend)

```typescript
{
  id: UUID,                    // Identificador único
  churchId: UUID,              // Isolamento por igreja
  userId: UUID,                // Quem fez
  action: string,              // Tipo de ação
  description: string,         // Descrição legível
  entityType?: string,         // Tipo de entidade (ex: Requisition)
  entityId?: string,           // ID da entidade afectada
  changes?: JSON,              // Dados alterados (before/after)
  metadata?: JSON,             // Contexto adicional
  ipAddress?: string,          // IP do cliente
  userAgent?: string,          // Browser/User agent
  createdAt: DateTime,         // Timestamp (imutável)
}
```

### AuditEvent (Frontend)

```typescript
{
  action: string,              // Tipo de evento
  description: string,         // Descrição
  entityType?: string,
  entityId?: string,
  changes?: any,
  metadata?: {
    url?: string,              // URL actual
    referrer?: string,         // Página anterior
    userAgent?: string,
    timestamp?: string,
    screenResolution?: string,
    pageTitle?: string,
    element?: {                // Para ELEMENT_CLICKED
      tag: string,             // <button>, <input>, etc
      id?: string,
      class?: string,
      text?: string
    }
  }
}
```

---

## 🔧 Implementação

### Frontend - AuditService (auditService.ts)

**Localização**: `/frontend/src/services/auditService.ts`

#### Inicialização
```typescript
import './services/auditService';  // Carrega em main.tsx
```

Ao iniciar a app, automaticamente:
1. Ataca listeners aos eventos globais
2. Começa a coletar eventos
3. Inicia timer de flush (5s)

#### Métodos Principais

```typescript
// Logar evento manualmente
auditService.logBusinessAction({
  action: 'REQUISITION_APPROVED',
  description: 'Requisição #REQ-001 aprovada',
  entityType: 'Requisition',
  entityId: 'abc-123',
  changes: { status: 'PENDING' -> 'APPROVED' }
});

// Login/Logout automático
auditService.logLogin(userEmail);    // Em AuthContext
auditService.logLogout();            // Em AuthContext
```

#### Batching & Performance
- **Queue Size**: 10 eventos por batch
- **Auto Flush**: A cada 5 segundos
- **Throttling**:
  - Mouse moves: 2 segundos
  - Scroll events: 1 evento por scroll
- **Sensitive Data**: Redação de passwords/tokens

#### Eventos Globais Interceptados

```typescript
// Click listener (event bubbling)
document.addEventListener('click', handleGlobalClick);

// Form listeners
document.addEventListener('submit', handleFormSubmit);
document.addEventListener('change', handleInputChange);
document.addEventListener('input', handleInput);

// Window listeners
window.addEventListener('error', handleError);
window.addEventListener('mousemove', handleMouseMove);   // Throttled
document.addEventListener('scroll', handleScroll);        // Throttled
window.addEventListener('visibilitychange', ...);
window.addEventListener('popstate', handleNavigation);   // Rotas
```

---

### Backend - Endpoints

#### GET /audit/logs
Listar logs de auditoria com suporte a filtros.

**Query Parameters**:
```
GET /audit/logs?limit=50&offset=0&action=LOGIN&userId=abc-123
```

- `limit` (default: 100) - Máximo de resultados
- `offset` (default: 0) - Paginação
- `action` (optional) - Filtrar por tipo de ação
- `userId` (optional) - Filtrar por utilizador

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid-123",
      "action": "USER_LOGIN",
      "description": "Utilizador fez login",
      "userId": "user-456",
      "entityType": null,
      "entityId": null,
      "changes": null,
      "metadata": {
        "url": "https://app.com/login",
        "userAgent": "Mozilla/5.0...",
        "screenResolution": "1920x1080"
      },
      "createdAt": "2024-01-20T10:30:00Z"
    }
  ],
  "total": 1543,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "pages": 31
  }
}
```

#### POST /audit/batch-log
Receber batch de eventos do frontend.

**Request**:
```json
{
  "events": [
    {
      "action": "ELEMENT_CLICKED",
      "description": "Clique no botão Aprovar",
      "metadata": {
        "element": {
          "tag": "button",
          "class": "btn-primary",
          "text": "Aprovar"
        }
      }
    }
  ]
}
```

---

## 🔒 Segurança & Imutabilidade

### Imutabilidade
- ❌ Sem UPDATE de logs
- ❌ Sem DELETE de logs
- ✅ Apenas CREATE permitido
- ✅ Índices para query rápida

### Isolamento
- Logs isolados por `churchId`
- Utilizadores veem apenas logs da sua igreja
- ADMIN pode ver todos (futuro)

### Sensitive Data
Frontend mascarar automaticamente:
- Passwords: `****`
- Tokens: `****...****` (primeiros 4 + últimos 4)
- Campos grandes (>100 chars): truncar

---

## 📊 Página de Auditoria (AuditPage.tsx)

**Localização**: `/frontend/src/pages/AuditPage.tsx`

### Features

#### Tabela de Logs
- 5 colunas: Data/Hora | Ação | Descrição | Tipo Entidade | Detalhes
- Cores de ação (verde=sucesso, vermelho=erro, azul=auth, ciano=user action)
- Icons emojis para rápida identificação
- Expandível (details) para ver dados completos

#### Filtros
- Por Ação (ex: REQUISITION, LOGIN, CLICKED)
- Por Utilizador (UUID)
- Seleccionar limite de resultados (10, 25, 50, 100)
- Botão Recarregar

#### Paginação
- Navegação anterior/próxima
- Info: "Mostrando 1 a 50 de 1543"
- Desabilita botões quando no início/fim

#### Responsividade
- Desktop: 4 colunas de filtro
- Tablet: 2 colunas
- Mobile: 1 coluna, tabela scrollável

---

## 🚀 Fluxo de Funcionamento

### 1. Utilizador Faz Ação
```
Utilizador clica em botão "Aprovar Requisição"
```

### 2. Frontend Intercepta
```
document.addEventListener('click', handleGlobalClick);
├─ Coleta informações do elemento
├─ Enriquece com metadata (URL, timestamp, etc)
├─ Redacta dados sensíveis
└─ Adiciona à fila de eventos
```

### 3. Batching (a cada 5s ou 10 eventos)
```
auditService.flush();
├─ Agrupa até 10 eventos
├─ POST /audit/batch-log ao backend
└─ Aguarda confirmação (retry se falhar)
```

### 4. Backend Processa
```
POST /audit/batch-log
├─ Valida userId e churchId
├─ Enriquece com IP address
├─ Enriquece com User-Agent header
├─ Cria AuditLog entity para cada evento
└─ Batch save na BD
```

### 5. BD Armazena (Imutável)
```
INSERT INTO audit_logs (...)
├─ Cria índices para query rápida
├─ Impossível UPDATE/DELETE
└─ Disponível para auditoria permanente
```

### 6. Frontend Exibe
```
GET /audit/logs?limit=50&offset=0
├─ Busca logs com filtros (opcional)
├─ Exibe na tabela com cores e icons
├─ Permite expandir para ver details
└─ Pagination automática
```

---

## 📈 Exemplos de Uso

### Login Tracking
```
Quando utilizador faz login:
→ auditService.logLogin(user.email)
→ Registra USER_LOGIN com timestamp, IP, user-agent
→ Quando logout: registra USER_LOGOUT + duração
```

### Form Submission
```
Utilizador submete formulário "Criar Requisição"
→ handleFormSubmit intercepta
→ Coleta nome do form + campo de valores
→ Registra FORM_SUBMITTED
→ Se erro: registra ERROR_OCCURRED
```

### Business Action
```
Service aprova requisição:
→ auditService.logBusinessAction({
    action: 'REQUISITION_APPROVED',
    entityType: 'Requisition',
    entityId: reqId,
    changes: { status: 'PENDING' -> 'APPROVED' }
  })
→ Registra no BD com userId, churchId
```

### View Audit Trail
```
GET /audit/logs?action=REQUISITION_APPROVED&limit=100
→ Mostra últimas 100 aprovações de requisições
→ Filtra por data decrescente (mais recente primeiro)
→ Exibe na UI com colors e details expandíveis
```

---

## ⚙️ Configuração

### Frontend Config
**Arquivo**: `/frontend/src/services/auditService.ts`

```typescript
private batchSize = 10;           // Eventos por batch
private flushInterval = 5000;     // ms até flush
private mouseThrottle = 2000;     // ms entre mouse events
```

### Backend Config
**Arquivo**: `/backend/src/modules/audit/audit.service.ts`

Sem configuração necessária - usa defaults

---

## 🐛 Troubleshooting

### Eventos não aparecem
1. Verificar se auditService está carregado em main.tsx
2. Verificar se POST /audit/batch-log está respondendo
3. Abrir DevTools → Network → Procurar "batch-log" requests

### Performance lenta
1. Aumentar `mouseThrottle` (reduz eventos de mouse)
2. Aumentar `flushInterval` (menos requisições HTTP)
3. Reduzir `batchSize` (menos eventos por batch)

### Dados truncados/redactados
1. Verificar função `redactSensitiveValues()` em auditService.ts
2. Adicionar mais padrões se necessário
3. Revisar em Base de Dados se estava realmente truncado

---

## 📝 Notas de Desenvolvimento

### Adicionar Novo Tipo de Evento
1. Adicionar action ao enum em `audit-log.entity.ts`
2. Adicionar listener em `auditService.ts`
3. Opcionalmente adicionar label em `getActionLabel()` na AuditPage

### Filtros Avançados
Já suportado - adicionar em AuditPage.tsx:
```typescript
// Adicionar date range filter
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');

// Passar como query params
&startDate=${startDate}&endDate=${endDate}
```

### Export de Dados
Para implementar:
1. Adicionar endpoint `GET /audit/logs/export?format=csv`
2. Converter array de logs para CSV
3. Download automático

---

## ✅ Checklist de Features

- [x] Global click listener
- [x] Form submission tracking
- [x] User typing detection
- [x] Mouse movement tracking (throttled)
- [x] Page scroll tracking (throttled)
- [x] JavaScript error logging
- [x] Page visibility tracking
- [x] Navigation tracking
- [x] Login/Logout with session duration
- [x] Event batching (10 events or 5s)
- [x] Backend batch endpoint
- [x] Database storage
- [x] Pagination support
- [x] Action filtering
- [x] User filtering
- [x] Audit page with table display
- [x] Color-coded action badges
- [x] Expandable details view
- [x] Responsive design

---

## 🔮 Próximas Features (Futuro)

- [ ] Export para CSV/PDF
- [ ] Gráficos de atividade (eventos por hora)
- [ ] Alert de comportamento anómalo
- [ ] Real-time activity feed
- [ ] User behavior analytics
- [ ] Advanced filtering UI
- [ ] Auditoria de performance
- [ ] Session replay

---

**Data de Implementação**: 20 de Janeiro de 2024  
**Versão**: 1.0 (Completo)  
**Status**: ✅ Produção
