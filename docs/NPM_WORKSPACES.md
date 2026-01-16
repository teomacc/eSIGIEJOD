# Evitando Reinstalações de npm Modules

## ❌ O Problema

Cada workspace (backend, frontend) tem seu próprio `node_modules`. Isso resulta em:
- Duplicação de pacotes
- Instalações lentas e repetidas
- Muito espaço em disco (700MB+ por workspace)

## ✅ Soluções

### Solução 1: npm Workspaces (Recomendado)

O projeto já está configurado para isso! Use apenas UM `node_modules` compartilhado:

```bash
cd T:\GitHub\eSIGIEJOD

# Instala TUDO (backend + frontend) em uma só operação
npm install

# Agora você pode rodar diretamente:
npm run dev              # Backend + Frontend
npm run dev:backend      # Apenas backend
npm run dev:frontend     # Apenas frontend
```

**Vantagens:**
- Uma única instalação para ambos projetos
- Compartilha dependências comuns
- Muito mais rápido (5-7 minutos total vs 15+ minutos separado)
- Economiza 300-400MB de espaço em disco

### Solução 2: npm ci (Para Projetos Já Instalados)

Se já tem `node_modules`, use `npm ci` em vez de `npm install`:

```bash
# npm ci = "clean install" - mais rápido que npm install
# Usa package-lock.json para versões exatas
cd T:\GitHub\eSIGIEJOD
npm ci --legacy-peer-deps
```

**Quando usar:**
- Quando já tem `node_modules` instalado
- Quando quer garantir versões exatas
- Muito mais rápido (1-2 minutos)

### Solução 3: Limpar Cache e Reusar

```bash
# NÃO delete node_modules
# Apenas atualize:
npm update

# Ou adicione novo pacote sem redownload:
npm install novo-pacote

# Limpe apenas cache se tiver problemas
npm cache clean --force
```

## 📊 Comparação de Velocidade

| Método | Tempo | Espaço em Disco |
|--------|-------|-----------------|
| npm install (separado) | 15-20 min | 700MB+ |
| npm install (workspace) | 5-7 min | 400MB |
| npm ci (workspace) | 1-2 min | 400MB |
| npm update | 2-3 min | 400MB |

## 🚀 Setup Otimizado (Primeira Vez)

```bash
cd T:\GitHub\eSIGIEJOD

# Instale TUDO de uma vez
npm install --legacy-peer-deps

# Verificar que funcionou
npm run build           # Compila ambos projetos
npm run test           # Roda testes
```

## 🔄 Atualizações Futuras

```bash
# Adicionar novo pacote no backend
npm install --workspace=backend novo-pacote

# Adicionar novo pacote no frontend
npm install --workspace=frontend novo-pacote

# Atualizar todos os pacotes
npm update

# Atualizar apenas um workspace
npm update --workspace=backend
```

## 💾 Economizar Espaço em Disco

```bash
# Remover pacotes não usados
npm prune

# Remover devDependencies em produção
npm ci --omit=dev

# Ver quanto espaço node_modules usa
du -sh node_modules
```

## ⚠️ O Que NÃO Fazer

```bash
# ❌ NÃO faça isso (reinstala tudo desnecessariamente)
cd backend
npm install        # NÃO! Já foi instalado no root

# ❌ NÃO delete node_modules a cada vez
rm -r node_modules # Evite fazer isto

# ❌ NÃO reinstale quando já tem package-lock.json
npm install        # Use npm ci em vez disto
```

## ✅ Workflow Recomendado

```bash
# Setup Inicial (uma única vez)
cd T:\GitHub\eSIGIEJOD
npm install --legacy-peer-deps    # ~7 minutos

# Desenvolvimento (dia a dia)
npm run dev                        # Roda backend + frontend

# Quando adiciona dependência nova
npm install --workspace=backend novo-pacote

# Quando volta ao projeto depois de dias
npm ci                            # ~1-2 minutos para atualizar
```

## 🎯 Dica Final

**Sempre trabalhe do diretório ROOT do projeto**, não entre em `backend/` ou `frontend/` para fazer `npm install`.

O npm workspace (configurado em `package.json` root) cuida de tudo automaticamente!

```json
{
  "workspaces": [
    "backend",
    "frontend"
  ]
}
```

Isso significa:
- `npm install` no root = instala ambos
- `npm install --workspace=backend pkg` = instala só no backend
- Dependências compartilhadas não são duplicadas
