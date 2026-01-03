# eSIGIEJOD - Sistema de Gestão Financeira Multi-Igrejas

Um sistema robusto de controlo, aprovação, auditoria e transparência financeira para múltiplas igrejas com hierarquia e regras claras.

## 🎯 Conceito Central

Tudo o que entra, sai ou é solicitado:
- ✔ Fica registado
- ✔ Tem responsável
- ✔ Tem aprovação
- ✔ Pode ser auditado

## 🏗️ Arquitetura

```
eSIGIEJOD/
├── backend/              # NestJS + PostgreSQL
│   ├── src/
│   │   ├── modules/      # Módulos de negócio
│   │   │   ├── auth/           # Autenticação e RBAC
│   │   │   ├── finances/       # Entradas de dinheiro e fundos
│   │   │   ├── requisitions/   # Requisições de despesa
│   │   │   ├── approval/       # Lógica de aprovação automática
│   │   │   ├── audit/          # Logs imutáveis
│   │   │   └── reports/        # Relatórios e análises
│   │   ├── app.module.ts       # Módulo raiz
│   │   └── main.ts             # Entrada da aplicação
│   └── package.json
│
├── frontend/             # React + TypeScript
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── api/          # Cliente HTTP (Axios)
│   │   ├── context/      # Contexto de autenticação
│   │   ├── App.tsx       # Componente principal
│   │   └── index.tsx     # Entrada
│   └── package.json
│
├── docs/
│   └── ARCHITECTURE.md   # Guia detalhado de arquitetura
│
├── .github/
│   └── copilot-instructions.md  # Instruções para agentes IA
│
└── README.md             # Este arquivo
```

## 💰 Estrutura Financeira

### Tipos de Fundos
Cada igreja pode ter vários fundos para evitar misturação de dinheiro:

1. **Fundo Geral** - Despesas operacionais gerais
2. **Fundo de Construção** - Projetos de construção/renovação
3. **Fundo de Missões** - Programas missionários
4. **Fundo Social** - Ajuda a necessitados
5. **Fundo de Eventos** - Organização de eventos
6. **Fundo de Emergência** - Reservas de emergência
7. **Fundo de Projectos Especiais** - Projectos específicos
8. **Fundo de Juventude** - Atividades de juventude
9. **Fundo de Mulheres** - Atividades do grupo de mulheres
10. **Fundo de Manutenção** - Manutenção de infraestrutura

### Tipos de Entradas
- **Dízimos** - Dízimos regulares dos membros
- **Ofertas normais** - Ofertas no culto
- **Ofertas especiais** - Ofertas para fins específicos
- **Ofertas direccionadas** - Ofertas para fundos específicos
- **Contribuições mensais** - Contribuições periódicas
- **Donativos externos** - Doações de externos
- **Transferências entre igrejas** - Com aprovação
- **Ajustes autorizados** - Correcções autorizadas

### Categorias de Despesa (16 tipos)
Alimentação, Transporte, Hospedagem, Material de escritório, Material litúrgico, Equipamentos, Manutenção, Apoio social, Organização de eventos, Formação/seminários, Saúde/emergência, Projectos missionários, Comunicação, Energia/água, Combustível, Outros

## 🔄 Fluxo de Requisição de Despesa

```
1. Requisitante cria requisição
   ↓
2. Sistema calcula magnitude (Pequena/Média/Grande/Crítica)
   ↓
3. Sistema determina nível de aprovação automático
   ↓
4. Requisição vai para aprovador designado
   ↓
5. Aprovador revê e aprova/rejeita
   ↓
6. Se aprovada: pode ser executada
   ↓
7. Todas as ações registadas no audit log (imutável)
```

## 🎓 Hierarquia de Aprovação

Baseada na quantidade solicitada:

| Montante | Aprovador | Papel |
|----------|-----------|-------|
| ≤ 5.000 MT | Tesoureiro Local | TREASURER |
| 5.001 – 20.000 MT | Director Financeiro | DIRECTOR |
| 20.001 – 50.000 MT | Conselho de Direcção | BOARD |
| > 50.000 MT | Pastor Sénior | PASTOR |

**Nota:** Thresholds são configuráveis no sistema.

## 🔐 Roles e Permissões

- **PASTOR** - Aprovação suprema, acesso total
- **DIRECTOR** - Aprovações até 50.000 MT, relatórios
- **TREASURER** - Gestão de dinheiro, aprovações até 5.000 MT
- **AUDITOR** - Acesso de leitura a logs e relatórios
- **VIEWER** - Acesso limitado, apenas visualização

## 📊 Variáveis Financeiras Importantes

Cada requisição contém:
- **Código único** - Identificação imutável
- **Valor solicitado** - Montante original
- **Valor aprovado** - Pode ser diferente do solicitado
- **Fundo afectado** - Qual fundo será debitado
- **Igreja de origem** - Isolamento de dados
- **Categoria** - Tipo de despesa
- **Magnitude** - Pequena/Média/Grande/Crítica
- **Estado** - Pendente/Em análise/Aprovada/Rejeitada/Cancelada/Executada
- **Justificação** - Motivo da requisição
- **Anexos** - Recibos, facturas, fotos
- **Data de solicitação** - Quando foi criada
- **Data de aprovação** - Quando foi aprovada
- **Responsável pela aprovação** - Quem aprovou

## 🔒 Regras Inteligentes

### 1. Imutabilidade
- Transações financeiras nunca são deletadas
- Correcções são feitas via entradas de ajuste
- Audit logs não podem ser modificados

### 2. Isolamento por Igreja
- Cada igreja tem seus dados completamente isolados
- Queries sempre filtram por churchId
- Sem acesso cruzado sem autorização explícita

### 3. Cadeia Sequencial de Aprovação
- Uma requisição não pode pular níveis de aprovação
- Deve passar pelo UNDER_REVIEW antes de APPROVED
- Enforcement automático no serviço

### 4. Integridade de Fundos
- Transferências entre fundos são explícitas
- Cada transação pertence a exatamente um fundo
- Sem mistura de dinheiro

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Axios
- **Backend:** NestJS + Node.js
- **Banco de Dados:** PostgreSQL
- **Autenticação:** JWT + Role-Based Access Control (RBAC)
- **ORM:** TypeORM

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- PostgreSQL 12+

### Instalação

```powershell
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Configuração

```powershell
# Copiar template de ambiente
cp .env.example .env

# Editar .env com suas credenciais PostgreSQL
# DATABASE_HOST=localhost
# DATABASE_USER=postgres
# DATABASE_PASSWORD=sua_senha
# JWT_SECRET=sua_chave_secreta
```

### Inicializar Banco de Dados

```powershell
cd backend
npm run typeorm:migration:run
```

### Executar em Desenvolvimento

```powershell
# Terminal 1: Backend (porta 3001)
cd backend
npm run start:dev

# Terminal 2: Frontend (porta 3000)
cd frontend
npm start
```

## 📚 Documentação

- **ARCHITECTURE.md** - Guia detalhado de arquitetura
- **.github/copilot-instructions.md** - Instruções para agentes IA
- **SETUP.md** - Instruções de setup completo
- Comentários de código nos módulos explicam o fluxo

## 🎯 Padrões Principais

### Recording Income (Backend)
```typescript
// 1. Validar dados de entrada
// 2. Criar registro imutável de renda
// 3. Atualizar saldo do fundo
// 4. Registar no audit log
// 5. Retornar resultado ao cliente
```

### Creating Requisition (Backend)
```typescript
// 1. Validar requisição
// 2. Calcular magnitude (baseado no montante)
// 3. Determinar nível de aprovação automaticamente
// 4. Criar requisição em estado PENDING
// 5. Registar no audit log
// 6. Retornar código único
```

### Approval Routing (Backend)
```typescript
// 1. Receber requisição de aprovação
// 2. Verificar autoridade do aprovador
// 3. Validar cadeia sequencial de aprovação
// 4. Atualizar estado da requisição
// 5. Registar aprovação no audit log
// 6. Confirmar ao cliente
```

## ⚙️ Variáveis de Controlo

O sistema monitora:
- Limite mensal por igreja
- Limite mensal por fundo
- Limite por categoria
- Percentagem máxima de gastos
- Detecção automática de atividade suspeita

## 📈 Relatórios Automáticos

1. **Financeiro mensal** - Por igreja
2. **Financeiro geral** - Todas as igrejas
3. **Comparação entre igrejas** - Análise comparativa
4. **Por fundo** - Breakdown por fundo
5. **Por categoria** - Breakdown por categoria
6. **Aprovados/Rejeitados** - Status das requisições
7. **Desvios detectados** - Análise de anomalias (IA)
8. **Saldo acumulado** - Posição financeira

## 🤖 Integração de IA

O sistema está preparado para:
- Detectar padrões anormais em gastos
- Alertar o Director Financeiro
- Sugerir auditorias
- Validar cálculos
- Gerar resumos automáticos
- Apoiar decisões financeiras

## 📝 Notas Importantes para Desenvolvimento

### Nunca Fazer
- ❌ Deletar registos financeiros
- ❌ Modificar logs de auditoria
- ❌ Misturar dados de igrejas
- ❌ Pular níveis de aprovação
- ❌ Hardcodel valores de thresholds

### Sempre Fazer
- ✅ Criar novos registos de ajuste para correcções
- ✅ Registar cada ação no audit log
- ✅ Filtrar por churchId em todas as queries
- ✅ Validar autoridades de aprovação
- ✅ Usar transações para operações multi-passo

## 🔗 Endpoints Principais

### Auth
- `POST /auth/login` - Autenticar usuário
- `POST /auth/register` - Registar novo usuário

### Finances
- `POST /finances/income` - Registar entrada
- `GET /finances/fund/{id}/balance` - Saldo do fundo
- `GET /finances/income/church` - Todas as entradas

### Requisitions
- `POST /requisitions` - Criar requisição
- `GET /requisitions/pending` - Pendentes de aprovação
- `POST /requisitions/{id}/approve` - Aprovar
- `POST /requisitions/{id}/reject` - Rejeitar

### Reports
- `GET /reports/monthly?month=X&year=Y` - Relatório mensal
- `GET /reports/general?month=X&year=Y` - Relatório geral
- `GET /reports/anomalies` - Detectar anomalias

### Audit
- `GET /audit/logs` - Ver audit trail
- `GET /audit/logs/entity/{id}` - Histórico de entidade
- `GET /audit/logs/action/{action}` - Filtrar por ação

## 📖 Próximos Passos

1. ✅ Estrutura do projeto criada
2. ✅ Módulos principais scaffolded
3. ✅ Documentação completada
4. ⏳ Implementar componentes de UI
5. ⏳ Testar fluxos de aprovação
6. ⏳ Adicionar notificações por email
7. ⏳ Integrar detecção de anomalias por IA

## 📄 Licença

MIT

## 🤝 Contribuições

Siga os padrões documentados em ARCHITECTURE.md ao contribuir.
