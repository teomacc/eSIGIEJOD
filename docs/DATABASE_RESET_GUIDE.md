# Guia de Reset e Gestão da Base de Dados

## 📋 Visão Geral

Este guia explica como gerir a base de dados em diferentes ambientes (desenvolvimento vs produção) e como fazer reset quando necessário.

## 🔄 Como Funciona a Sincronização Automática

O sistema está configurado com `synchronize: true` no TypeORM, o que significa:

- ✅ **As tabelas são criadas automaticamente** quando a aplicação inicia
- ✅ **As tabelas são recriadas** se forem apagadas manualmente
- ⚠️ **Mudanças no schema são aplicadas automaticamente** (pode causar perda de dados)

### Localização da Configuração
Arquivo: `backend/src/app.module.ts`

```typescript
synchronize: true, // ⚠️ apenas em desenvolvimento
```

---

## 🌱 Sistema de Seeds (Dados de Exemplo)

### O que são Seeds?

Seeds são dados iniciais inseridos automaticamente na base de dados para:
- Facilitar testes durante desenvolvimento
- Criar usuário admin padrão
- Adicionar fundos de exemplo
- Criar receitas e requisições de demonstração

### Como Desabilitar Seeds

**Para ambiente de produção ou testes com dados reais:**

1. Abra o arquivo `.env` na pasta `backend`
2. Adicione ou modifique a linha:

```env
ENABLE_SEEDS=false
```

3. Reinicie o servidor backend

### Seeds Disponíveis

| Seeder | Descrição | Pode Desabilitar? |
|--------|-----------|-------------------|
| `DatabaseSeeder` | Cria usuário admin padrão | ❌ Não (essencial) |
| **`FinancesSeeder (Fundos)`** | **Cria fundos padrão com saldo zero** | ❌ **Não (essencial)** |
| `FinancesSeeder (Receitas)` | Cria receitas de exemplo | ✅ Sim |
| `RequisitionsSeeder` | Cria requisições de exemplo | ✅ Sim |

**IMPORTANTE:** Os fundos são sempre criados porque são essenciais para o sistema funcionar. Sem fundos, não é possível registrar receitas.

---

## 🗑️ Como Fazer Reset da Base de Dados

### Opção 1: Reset Completo (Recomendado)

**No pgAdmin ou terminal PostgreSQL:**

```sql
-- Conectar à base de dados postgres (padrão)
\c postgres

-- Apagar e recriar a base de dados
DROP DATABASE IF EXISTS esigiejod;
CREATE DATABASE esigiejod;
```

### Opção 2: Apagar Apenas os Dados (Manter Estrutura)

```sql
-- Conectar à base de dados
\c esigiejod

-- Apagar dados de todas as tabelas
TRUNCATE TABLE 
  "user",
  "fund",
  "revenue",
  "revenue_fund",
  "worship",
  "income",
  "requisition",
  "audit_log"
CASCADE;
```

### Opção 3: Reiniciar Aplicação (Se apagou tabelas manualmente)

Se você apagou as tabelas manualmente e está recebendo erros:

1. **Pare o servidor backend** (Ctrl+C)
2. **Aguarde 5 segundos**
3. **Inicie o servidor novamente**

```bash
cd backend
npm run start:dev
```

O TypeORM irá:
- ✅ Detectar que as tabelas não existem
- ✅ Recriar todas as tabelas automaticamente
- ✅ Executar os seeds (se `ENABLE_SEEDS=true`)

---

## 📝 Configuração para Produção

### Passo 1: Desabilitar Seeds

**Arquivo: `backend/.env`**
```env
ENABLE_SEEDS=false
NODE_ENV=production
```

### Passo 2: Desabilitar Synchronize (Futuro)

⚠️ **IMPORTANTE:** Em produção real, você deve:

1. Mudar `synchronize: false` no `app.module.ts`
2. Usar migrações do TypeORM ao invés de sync automático

**Por enquanto, para facilitar desenvolvimento, mantenha `synchronize: true`**

---

## 🔍 Resolução de Problemas

### Erro: "relação [tabela] não existe"

**Causa:** As tabelas foram apagadas mas a aplicação ainda está rodando.

**Solução:**
1. Pare o servidor backend (Ctrl+C)
2. Aguarde 5 segundos
3. Inicie novamente: `npm run start:dev`

### Seeds não estão sendo criados

**Verifique:**
1. ✅ `ENABLE_SEEDS=true` no `.env`
2. ✅ A base de dados está vazia (sem usuários/fundos)
3. ✅ Aguardou tempo suficiente (seeds levam 3-5 segundos)

**Logs esperados (com ENABLE_SEEDS=false):**
```
🌱 [SEED] Verificando base de dados...
📝 [SEED] Base de dados vazia. Criando Admin padrão...
✅ [SEED] Admin padrão criado com sucesso!
🌱 Criando fundos padrão (ESSENCIAIS)...
✅ 5 fundos criados com saldo zero
⏭️  Seeds de receitas de exemplo desabilitados via ENABLE_SEEDS=false
✅ Fundos criados! Sistema pronto para uso.
```

**Logs esperados (com ENABLE_SEEDS=true):**
```
🌱 [SEED] Verificando base de dados...
📝 [SEED] Base de dados vazia. Criando Admin padrão...
✅ [SEED] Admin padrão criado com sucesso!
🌱 Criando fundos padrão (ESSENCIAIS)...
✅ 5 fundos criados com saldo zero
🌱 Criando receitas de exemplo...
✅ 37 entradas criadas
```

### Seeds estão rodando mas não quero

**Solução:**
```env
# Arquivo: backend/.env
ENABLE_SEEDS=false
```

Depois reinicie o servidor.

---

## 🎯 Fluxo Recomendado para Teste em Produção

1. **Configurar ambiente limpo:**
   ```env
   ENABLE_SEEDS=false
   NODE_ENV=production
   ```

2. **Fazer reset da base de dados:**
   ```sql
   DROP DATABASE IF EXISTS esigiejod;
   CREATE DATABASE esigiejod;
   ```

3. **Iniciar aplicação:**
   ```bash
   npm run start:dev
   ```

4. **Verificar logs:**
   - ✅ Deve ver "Tabelas criadas automaticamente"
   - ✅ Deve ver "5 fundos criados com saldo zero"
   - ✅ Deve ver "Seeds de receitas de exemplo desabilitados"

5. **Sistema pronto:**
   - ✅ Admin padrão criado
   - ✅ 5 fundos criados com saldo 0 MTn
   - ✅ Pode começar a registrar receitas reais

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor backend
2. Verifique a configuração do `.env`
3. Confirme que o PostgreSQL está rodando
4. Verifique as credenciais da base de dados

**Comandos úteis:**
```bash
# Ver status do PostgreSQL
sudo systemctl status postgresql  # Linux
# ou procurar "Services" no Windows

# Testar conexão
psql -U postgres -d esigiejod -h localhost
```
