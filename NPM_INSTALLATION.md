# Installation Script for eSIGIEJOD

## Issue Resolved: Dependency Conflict

The `@nestjs/typeorm` package had a version conflict. This has been fixed by upgrading to `@nestjs/typeorm@10.0.0` which is compatible with `@nestjs/common@10.2.10`.

## Installation Steps

### Option 1: Automatic (Recommended)

Run the npm scripts from root:

```bash
# Install all dependencies
npm run install:all

# Or install individually
cd backend
npm install --legacy-peer-deps

cd ../frontend
npm install

cd ..
```

### Option 2: Manual Steps

```bash
# Root
cd T:\GitHub\eSIGIEJOD
npm install

# Backend
cd backend
npm install --legacy-peer-deps

# Frontend
cd ../frontend
npm install

# Return to root
cd ..
```

## What Was Changed

**backend/package.json:**
- `@nestjs/typeorm`: Updated from `^9.0.1` to `^10.0.0`
- All other versions remain compatible

## Verify Installation

```bash
# Check if packages installed successfully
npm list --depth=0

# In backend folder
cd backend
npm list --depth=0
cd ..

# In frontend folder
cd frontend
npm list --depth=0
cd ..
```

## Troubleshooting

If you still get errors:

```bash
# Clear npm cache
npm cache clean --force

# Retry with legacy peer deps flag
npm install --legacy-peer-deps
```

## Next Steps

Once installation completes successfully:

1. ✅ Dependencies installed
2. Create PostgreSQL database:
   ```bash
   psql -U postgres -c "CREATE DATABASE esigieiod_dev;"
   ```

3. Start development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run start:dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000/api

---

See **SETUP.md** for complete installation guide.
