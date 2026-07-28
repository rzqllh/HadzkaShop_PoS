# Task 1: Audit Database Schema & Core Libraries

**Files:**
- Modify: `prisma/schema.prisma` (if needed)
- Modify: `src/lib/client.ts`, `src/lib/middleware.ts`, `src/lib/prisma.ts`, `src/lib/server.ts`, `src/lib/toast.tsx`, `src/lib/utils.ts`

**Interfaces:**
- Produces: Validated Prisma schema and core library utilities (auth, db, utils).

- [ ] **Step 1: Read and analyze Prisma Schema**
Review relationships, cascade behaviors, and `shopId` enforcement. Note any missing fields.

- [ ] **Step 2: Read and analyze `src/lib/` files**
Review all files in `src/lib/` for security, type safety, and proper utility patterns.

- [ ] **Step 3: Document findings and apply fixes for Task 1**
Write down any bugs or architecture violations found. Apply fixes to the respective files.

## Global Constraints

- **No client secrets in frontend.** Midtrans server key, DB credentials, auth secrets — server-side only.
- **No raw SQL outside `lib/db/`.** All database access goes through Prisma.
- **Atomic stock operations.** Stock decrements must happen inside the same database transaction.
- **`shopId` on every business entity.** No global singletons.
