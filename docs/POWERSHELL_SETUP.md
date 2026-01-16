# PowerShell Troubleshooting Guide

## Issue Resolved: Execution Policy Error

### Problem
```
npm : O arquivo C:\Program Files\nodejs\npm.ps1 não pode ser carregado porque a execução de 
scripts foi desabilitada neste sistema.
```

### Solution Applied
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

This command allows PowerShell to execute scripts for the current user, which is required for npm to work.

## What This Does

- **RemoteSigned**: Allows running locally created scripts AND downloaded scripts that are signed
- **CurrentUser**: Only applies to the current user (no admin rights needed)
- **-Force**: Skips confirmation prompt

## Alternative (If Needed)

If you encounter further issues, you can also try:

```powershell
# More permissive (use only if RemoteSigned doesn't work)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force

# To check current policy
Get-ExecutionPolicy -List
```

## npm Installation

Once execution policy is set, you can now run:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Go back to root
cd ..
```

## Verify Installation

```bash
# Check npm version
npm --version

# Check node version
node --version

# List installed packages
npm list --depth=0
```

## Next Steps

1. ✅ Execution policy fixed
2. ⏳ npm install running
3. ⏳ Install backend dependencies
4. ⏳ Install frontend dependencies
5. ⏳ Create PostgreSQL database
6. ⏳ Run migrations
7. ⏳ Start backend server
8. ⏳ Start frontend server

---

For complete setup instructions, see: **SETUP.md**
