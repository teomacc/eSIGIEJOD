# GUIA DE SETUP - eSIGIEJOD

Guia completo para configurar e executar o sistema eSIGIEJOD em desenvolvimento

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

1. **Node.js** (v18.0.0 ou superior)
   - Download: https://nodejs.org/
   - Verificar: `node --version`

2. **PostgreSQL** (v12 ou superior)
   - Download: https://www.postgresql.org/
   - Verificar: `psql --version`

3. **Git**
   - Download: https://git-scm.com/
   - Verificar: `git --version`

4. **npm** ou **yarn** (vem com Node.js)
   - Verificar: `npm --version`

## 🚀 Instalação

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/eSIGIEJOD.git
cd eSIGIEJOD
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependências
npm install

# Criar arquivo .env baseado em .env.example
cp .env.example .env

# Editar .env com suas configurações
# Exemplo:
# DATABASE_URL=postgresql://user:password@localhost:5432/esigieiod_dev
# JWT_SECRET=sua-chave-secreta-super-segura
# API_PORT=3000
```

### 3. Configurar Banco de Dados

```bash
# No backend/
# Criar banco de dados PostgreSQL
psql -U postgres -c "CREATE DATABASE esigieiod_dev;"

# Executar migrations
npm run db:migrate

# (Opcional) Seed com dados de teste
npm run db:seed
```

### 4. Iniciar Backend

```bash
# No backend/
npm run start:dev
```

Você verá:
```
[Nest] 1234  - 01/15/2024, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 1234  - 01/15/2024, 10:30:02 AM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 1234  - 01/15/2024, 10:30:02 AM     LOG Server running on http://localhost:3000/
```

### 5. Configurar Frontend

```bash
cd ../frontend

# Instalar dependências
npm install

# Criar arquivo .env baseado em .env.example
cp .env.example .env

# Editar .env com suas configurações
# Exemplo:
# VITE_API_URL=http://localhost:3000/api
```

### 6. Iniciar Frontend

```bash
# No frontend/
npm run dev
```

Você verá:
```
  VITE v5.0.8  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## 🌐 Acessar a Aplicação

Frontend: http://localhost:5173/
Backend API: http://localhost:3000/api

## 📚 Endpoints Principais

### Autenticação
```
POST /api/auth/login
  Body: { email: string, password: string }
  Response: { access_token: string, user: User }
```

### Finanças
```
GET /api/finances/fund/{fundId}/balance
GET /api/finances/income/church
POST /api/finances/income
```

### Requisições
```
GET /api/requisitions
POST /api/requisitions
PUT /api/requisitions/{id}/approve
PUT /api/requisitions/{id}/reject
PUT /api/requisitions/{id}/execute
```

### Auditoria
```
GET /api/audit/logs
GET /api/audit/logs/entity/{entityId}
GET /api/audit/logs/period?startDate=...&endDate=...
```

### Relatórios
```
GET /api/reports/monthly?year=2024&month=1
GET /api/reports/general?startDate=...&endDate=...
GET /api/reports/compliance?startDate=...&endDate=...
GET /api/reports/anomalies
```

## 🔑 Credenciais de Teste (Mock)

Por enquanto, o sistema aceita qualquer email/senha em desenvolvimento.

Roles disponíveis:
- PASTOR - Acesso total
- DIRECTOR - Gestão financeira e requisições
- TREASURER - Operações financeiras
- AUDITOR - Apenas visualizar logs
- VIEWER - Apenas visualizar dashboards

## 🛠️ Comandos Úteis

### Backend

```bash
cd backend

# Desenvolvimento
npm run start:dev          # Com hot reload
npm run start:debug        # Com debugger

# Produção
npm run build             # Build do projeto
npm run start:prod        # Executar build

# Testes
npm test                  # Rodar testes
npm run test:watch       # Watch mode
npm run test:cov         # Com cobertura

# Linting
npm run lint             # Verificar erros
npm run format           # Formatar código

# Database
npm run db:migrate       # Rodar migrations
npm run db:seed          # Seed com dados

# TypeORM
npm run typeorm:migration:create  # Criar migration
npm run typeorm:migration:run     # Rodar migrations
npm run typeorm:migration:revert  # Reverter última
```

### Frontend

```bash
cd frontend

# Desenvolvimento
npm run dev              # Dev server

# Produção
npm run build           # Build otimizado
npm run preview         # Visualizar build

# Qualidade
npm run lint            # ESLint check
npm run type-check      # Type check
```

## 📁 Estrutura de Pastas

```
eSIGIEJOD/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/              # Autenticação
│   │   │   ├── finances/          # Gestão financeira
│   │   │   ├── requisitions/      # Requisições de despesa
│   │   │   ├── approval/          # Aprovações
│   │   │   ├── audit/             # Auditoria
│   │   │   └── reports/           # Relatórios
│   │   ├── app.module.ts          # Root module
│   │   └── main.ts                # Bootstrap
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Páginas
│   │   ├── components/            # Componentes reutilizáveis
│   │   ├── context/               # React Context (Auth)
│   │   ├── api/                   # Cliente HTTP
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
├── README.md
└── .gitignore
```

## 🔐 Variáveis de Ambiente

### Backend (.env)

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/esigieiod_dev

# JWT
JWT_SECRET=sua-chave-secreta-muito-segura
JWT_EXPIRES_IN=7d

# Server
API_PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173

# Limites de Aprovação (em MT)
APPROVAL_THRESHOLD_TREASURER=5000
APPROVAL_THRESHOLD_DIRECTOR=20000
APPROVAL_THRESHOLD_BOARD=50000
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=eSIGIEJOD
```

## 🐛 Troubleshooting

### Backend não conecta ao banco

```bash
# Verificar se PostgreSQL está rodando
psql -U postgres -c "\l"

# Verificar conexão
psql -U user -d esigieiod_dev -c "\dt"

# Se banco não existe:
psql -U postgres -c "CREATE DATABASE esigieiod_dev;"
npm run db:migrate
```

### Frontend não conecta ao backend

```bash
# Verificar se backend está rodando
curl http://localhost:3000/api/health

# Verificar CORS em backend/.env
# CORS_ORIGIN deve incluir http://localhost:5173
```

### Porta já em uso

```bash
# Backend (porta 3000)
lsof -i :3000      # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Frontend (porta 5173)
lsof -i :5173      # Linux/Mac
netstat -ano | findstr :5173  # Windows

# Matar processo:
kill -9 <PID>      # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

## 📝 Padrões de Código

### Backend (NestJS)

- **Estrutura**: Modular (por feature)
- **Naming**: camelCase para variáveis/funções, PascalCase para classes
- **Comments**: Português em comments de domínio de negócio
- **Decorators**: Use @Injectable(), @Module(), @UseGuards(), @Post(), etc

Exemplo de módulo:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  providers: [Service],
  controllers: [Controller],
})
export class FeatureModule {}
```

### Frontend (React + TypeScript)

- **Estrutura**: Pages, Components, Context, API
- **Naming**: PascalCase para componentes, camelCase para funções
- **Hooks**: useAuth(), useNavigate(), useState(), etc
- **Styling**: Inline styles para agora, CSS Modules depois

Exemplo de componente:
```typescript
export default function MyComponent() {
  const { user } = useAuth();
  return <div>{user?.email}</div>;
}
```

## 🚢 Deployment

### Backend (Node.js/NestJS)

Opções:
- Heroku
- AWS EC2 / Elastic Beanstalk
- DigitalOcean
- Railway.app
- Render.com

```bash
# Build para produção
npm run build

# Executar build
npm run start:prod

# Ou com PM2
pm2 start dist/main.js --name "esigieiod-api"
```

### Frontend (React/Vite)

Opções:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Firebase Hosting

```bash
# Build para produção
npm run build

# Saída em frontend/dist/
# Deploy o conteúdo de dist/
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar documentação em README.md
2. Consultar comentários no código (português)
3. Verificar logs do backend e frontend
4. Abrir issue no repositório

## 📄 Licença

Propriedade privada - Projeto eSIGIEJOD
