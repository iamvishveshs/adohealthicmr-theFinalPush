# Backend Directory

This directory contains all backend-related code for the ADO Health ICMR application.

## Structure

```
backend/
├── lib/           # Backend utilities and helpers
│   └── auth.ts    # Authentication and authorization utilities
└── scripts/       # Utility scripts
    ├── migrate-data.ts    # Data migration / helper scripts
    └── create-admin.ts     # Admin user creation script
```

## Usage

### Database

The main application uses an in-memory/file-backed store by default (see `src/lib/store`). Legacy helper scripts have been removed. If you need a persistent database, the project supports PostgreSQL via `DATABASE_URL`.

### Authentication

```typescript
import { getCurrentUser, requireAuth, requireAdmin } from '@/backend/lib/auth';

// Get current user
const user = await getCurrentUser(request);

// Protect route (requires authentication)
export const GET = requireAuth(async (request, user) => {
  // Handler code
});

// Protect route (requires admin)
export const POST = requireAdmin(async (request, user) => {
  // Handler code
});
```

## Scripts

### Migrate Data

Import existing data from JSON file to MongoDB:

```bash
npm run migrate
```

### Create Admin User

Create an admin user interactively:

```bash
npm run create-admin
```

## Notes

- All API routes are located in `src/app/api/` (Next.js App Router requirement)
- The backend folder contains reusable backend code that can be imported by API routes
- Data is stored in-memory with file backups by default; PostgreSQL can be enabled via `DATABASE_URL`
- Authentication uses JWT tokens stored in HTTP-only cookies
