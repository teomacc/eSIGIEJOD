# Testes - Sistema de Auditoria

## 🧪 Como Testar o Sistema de Auditoria

### Testes Manuais

#### 1. Login Tracking
```
1. Abrir aplicação
2. Fazer login (email/password)
3. Ir para "Auditoria"
4. Procurar por action "USER_LOGIN"
5. Verificar se timestamp e email aparecem
```

**Esperado**:
- ✅ USER_LOGIN registado
- ✅ Timestamp correcto
- ✅ Email aparece na descrição

---

#### 2. Click Tracking
```
1. Fazer login
2. Clicar em botões (Criar, Editar, Deletar, etc)
3. Ir para "Auditoria"
4. Procurar por "ELEMENT_CLICKED"
5. Expandir details para ver elemento
```

**Esperado**:
- ✅ Cada clique registado com elemento HTML
- ✅ Tag do elemento (<button>, <a>, etc)
- ✅ ID ou class do elemento visível

---

#### 3. Form Submission
```
1. Fazer login
2. Criar uma nova Iglesia
3. Preencher formulário
4. Submeter
5. Ir para "Auditoria"
6. Procurar por "FORM_SUBMITTED"
```

**Esperado**:
- ✅ FORM_SUBMITTED registado
- ✅ CHURCH_CREATED também registado (business action)
- ✅ Ambos no mesmo timeframe (segundos)

---

#### 4. Input Change Tracking
```
1. Fazer login
2. Editar uma Igreja
3. Mudar nome/detalhes
4. Voltar para Auditoria
5. Procurar por "USER_TYPING"
```

**Esperado**:
- ✅ USER_TYPING eventos para campo de input
- ✅ Descrição mostra qual campo foi digitado

---

#### 5. Scroll Tracking
```
1. Fazer login
2. Ir para tabela de Igrejas
3. Scroll para baixo
4. Voltar para Auditoria
5. Procurar por "PAGE_SCROLLED"
```

**Esperado**:
- ✅ PAGE_SCROLLED registado
- ✅ Posição X,Y em metadata

---

#### 6. Navigation Tracking
```
1. Fazer login
2. Clicar em diferentes páginas (Dashboard, Igrejas, etc)
3. Voltar para Auditoria
4. Procurar por "PAGE_NAVIGATION"
```

**Esperado**:
- ✅ PAGE_NAVIGATION para cada página visitada
- ✅ URL anterior/actual em metadata

---

#### 7. Error Tracking
```
1. Fazer login
2. Abrir DevTools Console (F12)
3. Executar: throw new Error('Test error')
4. Ir para Auditoria
5. Procurar por "ERROR_OCCURRED"
```

**Esperado**:
- ✅ ERROR_OCCURRED registado
- ✅ Mensagem de erro em changes/description

---

#### 8. Filtros
```
1. Ir para Auditoria
2. Filtrar por Ação = "LOGIN"
3. Clickar Recarregar
4. Verificar resultados
```

**Esperado**:
- ✅ Apenas USER_LOGIN exibidos
- ✅ Total matches filtrado

```
1. Copiar um userId da tabela
2. Filtrar por Utilizador = <id>
3. Clickar Recarregar
```

**Esperado**:
- ✅ Apenas ações desse utilizador
- ✅ Total matches reduzido

---

#### 9. Paginação
```
1. Ir para Auditoria
2. Seleccionar "50" em "Resultados por página"
3. Clicar "Próxima →"
4. Verificar offset mudou
```

**Esperado**:
- ✅ Novos logs carregados
- ✅ Info mostra "Mostrando 51 a 100"
- ✅ Botão "← Anterior" ativado

---

#### 10. Logout Tracking
```
1. Fazer login
2. Clicar Logout
3. Fazer login novamente
4. Ir para Auditoria
5. Procurar por "USER_LOGOUT"
```

**Esperado**:
- ✅ USER_LOGOUT registado
- ✅ Duração de sessão em metadata

---

### Testes via API (cURL/Postman)

#### Listar Todos os Logs
```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:3000/audit/logs

# Com paginação
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:3000/audit/logs?limit=50&offset=0"
```

**Resposta Esperada**:
```json
{
  "logs": [...],
  "total": 1543,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "pages": 31
  }
}
```

#### Filtrar por Ação
```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:3000/audit/logs?action=USER_LOGIN"
```

**Resposta Esperada**:
```json
{
  "logs": [
    {
      "id": "uuid-123",
      "action": "USER_LOGIN",
      "description": "...",
      ...
    }
  ],
  "total": 42,
  ...
}
```

#### Filtrar por Utilizador
```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:3000/audit/logs?userId=<USER_ID>&limit=100"
```

**Resposta Esperada**: Logs apenas deste utilizador

#### Receber Batch de Eventos
```bash
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "action": "ELEMENT_CLICKED",
        "description": "Clique em botão",
        "metadata": {
          "element": { "tag": "button" }
        }
      }
    ]
  }' \
  http://localhost:3000/audit/batch-log
```

**Resposta Esperada**:
```json
{
  "success": true,
  "count": 1,
  "message": "1 eventos registados com sucesso"
}
```

---

### Verificações de Base de Dados

#### Ver Tabela de Logs
```sql
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;
```

**Esperado**: Logs com timestamps recentes

#### Contar Logs por Ação
```sql
SELECT action, COUNT(*) as count 
FROM audit_log 
GROUP BY action 
ORDER BY count DESC;
```

**Esperado**:
```
USER_TYPING       | 432
ELEMENT_CLICKED   | 289
PAGE_SCROLLED     | 145
FORM_SUBMITTED    | 67
PAGE_NAVIGATION   | 45
USER_LOGIN        | 12
...
```

#### Logs de um Utilizador
```sql
SELECT * FROM audit_log 
WHERE user_id = '<USER_UUID>' 
ORDER BY created_at DESC;
```

**Esperado**: Apenas logs desse utilizador

#### Logs de uma Ação Específica
```sql
SELECT * FROM audit_log 
WHERE action = 'REQUISITION_APPROVED' 
ORDER BY created_at DESC;
```

**Esperado**: Apenas aprovações

---

### Testes de Performance

#### Volume de Eventos
```
Ação: Deixar app aberta por 1 hora
Resultado: Registar número total de eventos

SELECT COUNT(*) FROM audit_log 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Esperado**: Centenas de eventos sem erros

#### Tamanho do Database
```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('audit_log')) as size
FROM audit_log;
```

**Esperado**: Cresce proporcionalmente ao uso

#### Query Performance
```
Tempo esperado para GET /audit/logs?limit=100:
- < 100ms (local)
- < 500ms (staging)
- < 1000ms (production)
```

---

### Testes de Segurança

#### Dados Sensíveis Redactados
```
1. Editar um User com password
2. Ir para Auditoria
3. Procurar por USER_TYPING no campo password
4. Verificar se password está mascarado
```

**Esperado**: Password mostra como `****`

#### Isolamento por Igreja
```
1. Utilizador de Igreja A faz login
2. Verificar /audit/logs - mostra apenas logs da Igreja A

3. Utilizador de Igreja B faz login
4. Verificar /audit/logs - mostra apenas logs da Igreja B
```

**Esperado**: Sem cross-contamination entre igrejas

#### Apenas Leitura
```
1. Tentar DELETE de audit_log (directo BD) - deve falhar
2. Tentar UPDATE de audit_log - deve falhar
3. Criar novo log - deve succeeder
```

**Esperado**: Imutabilidade garantida

---

### Testes de UI

#### Responsividade
```
Desktop (1920x1080):
- ✅ 4 colunas de filtro side-by-side
- ✅ Tabela com scroll horizontal se necessário

Tablet (768x1024):
- ✅ 2 colunas de filtro
- ✅ Tabela ainda visível

Mobile (375x667):
- ✅ 1 coluna de filtro
- ✅ Tabela scrollável horizontalmente
- ✅ Sem overflow visível
```

#### Acessibilidade
```
- Keyboard navigation: Tab funciona em filtros e botões
- Labels: Cada input tem label descritivo
- Cores: Não depender só de cor (tem icons)
- ARIA: Tabelas com proper headers
```

#### Performance Frontend
```
1. Ir para Auditoria
2. Abrir DevTools → Performance
3. Carregar 100 logs
4. Recording: Scroll na tabela

Esperado:
- FCP (First Contentful Paint): < 1s
- LCP (Largest Contentful Paint): < 2s
- CLS (Cumulative Layout Shift): < 0.1
```

---

### Testes de Integração

#### Fluxo Completo
```
1. Login
  ✅ USER_LOGIN registado
  
2. Criar Igreja
  ✅ ELEMENT_CLICKED (form submit button)
  ✅ FORM_SUBMITTED
  ✅ CHURCH_CREATED (business action)
  
3. Editar Igreja
  ✅ USER_TYPING (campos)
  ✅ FORM_SUBMITTED
  ✅ CHURCH_UPDATED (business action)
  
4. Ir para Auditoria
  ✅ PAGE_NAVIGATION
  ✅ PAGE_SCROLLED (ao scroll)
  
5. Filtrar + Paginar
  ✅ Logs aparecem corretos
  
6. Logout
  ✅ USER_LOGOUT com duração
```

---

## 📊 Relatório de Testes

### Template de Checklist
```
Teste Manual: [X] Completo [ ] Parcial [ ] Falho
- Login Tracking        [X]
- Click Tracking        [X]
- Form Submission       [X]
- Input Change          [X]
- Scroll Tracking       [X]
- Navigation            [X]
- Error Handling        [X]
- Filters               [X]
- Pagination            [X]
- Logout Tracking       [X]

API Tests:             [X]
- List logs            [X]
- Filter by action     [X]
- Filter by user       [X]
- Batch endpoint       [X]

Database Tests:        [X]
- Data integrity       [X]
- Query performance    [X]
- Volume handling      [X]

Security Tests:        [X]
- Sensitive data       [X]
- Church isolation     [X]
- Immutability         [X]

UI Tests:              [X]
- Responsiveness       [X]
- Accessibility        [X]
- Performance          [X]

Integration Tests:     [X]
- Full flow            [X]

Status: ✅ TODOS OS TESTES PASSANDO
```

---

## 🔍 Debugging

### Verificar se AuditService Está Carregado
```javascript
// No DevTools Console:
console.log(typeof auditService !== 'undefined');
// Esperado: true
```

### Ver Fila de Eventos
```javascript
// Adicionar ao auditService.ts (temporário):
console.log('Queue:', this.queue);
// Aparece a cada 5s com eventos colectados
```

### Monitorar POST /audit/batch-log
```javascript
// DevTools → Network → Filter "batch-log"
// Ver cada requisição POST
// Verificar resposta: { success: true, count: X }
```

### Logs em BD (Timestamp)
```sql
SELECT 
  created_at,
  action,
  user_id,
  COUNT(*) as count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY created_at, action, user_id
ORDER BY created_at DESC;
```

Mostra eventos dos últimos 5 minutos

---

**Última Atualização**: 20 de Janeiro de 2024
