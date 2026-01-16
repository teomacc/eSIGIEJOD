# Backend Setup - Quick Reference

## Current Status

npm install is running in the background for the backend.

**What's being installed:**
- @nestjs/common - Core NestJS framework
- @nestjs/core - Core NestJS functionality  
- @nestjs/config - Configuration management
- @nestjs/typeorm - Database ORM integration
- @nestjs/jwt - JWT authentication
- @nestjs/passport - Passport authentication strategies
- PostgreSQL driver (pg)
- And 50+ other dependencies

## After Installation Completes

### 1. Create .env File

Create `backend/.env` with your database credentials:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=esigieiod_dev

# JWT
JWT_SECRET=your-secret-key-min-32-chars-long-for-security
JWT_EXPIRATION=7d

# Server
API_PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 2. Create PostgreSQL Database

```bash
psql -U postgres -c "CREATE DATABASE esigieiod_dev;"
```

Or using psql interactive:

```bash
psql -U postgres
# Then in psql prompt:
CREATE DATABASE esigieiod_dev;
\q
```

### 3. Start the Backend Server

```bash
npm run start:dev
```

You should see:

```
[Nest] 12345  - 01/03/2026, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 01/03/2026, 10:30:02 AM     LOG [InstanceLoader] ConfigModule dependencies initialized
[Nest] 12345  - 01/03/2026, 10:30:02 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] 12345  - 01/03/2026, 10:30:02 AM     LOG Server running on http://localhost:3000
```

## Troubleshooting

### If you still get "Cannot find module" errors:

```bash
# Clear TypeScript cache
rm -r dist

# Rebuild
npm run build

# Or restart dev server
npm run start:dev
```

### If database connection fails:

Check your `.env` file - make sure all values match your PostgreSQL setup:

```bash
# Test connection
psql -U postgres -d esigieiod_dev -c "SELECT 1;"
```

### If port 3000 is already in use:

```bash
# Use different port
API_PORT=3001 npm run start:dev
```

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/           # Authentication
│   │   ├── finances/       # Financial management
│   │   ├── requisitions/   # Expense requests
│   │   ├── approval/       # Auto-approvals
│   │   ├── audit/          # Audit logging
│   │   └── reports/        # Reports generation
│   ├── app.module.ts       # Root module
│   └── main.ts             # Entry point
├── package.json
├── tsconfig.json
└── .env
```

## Available Commands

```bash
# Development
npm run start:dev       # Run with auto-reload
npm run start:debug     # Run with debugger

# Production
npm run build          # Compile TypeScript
npm run start:prod     # Run compiled code

# Testing
npm test               # Run unit tests
npm run test:watch     # Watch mode

# Code quality
npm run lint          # ESLint check
npm run format        # Format code
```

## Next Steps

1. ⏳ Wait for `npm install` to complete
2. ✅ Create `.env` file in backend folder
3. ✅ Create PostgreSQL database
4. ✅ Run `npm run start:dev`
5. ✅ Verify API is running: http://localhost:3000/api

Then start the frontend:

```bash
cd ../frontend
npm install
npm run dev
```

Access at: http://localhost:5173
