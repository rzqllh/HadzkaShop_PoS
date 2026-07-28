# Task 4: Audit Next.js Pages & Routing

**Files:**
- Audit: `src/app/` (Check Server Components, authentication guards, and layout.tsx)
- Focus specifically on files that threw warnings or errors during the baseline test:
  - `src/app/(admin)/admin-nav.tsx`
  - `src/app/(admin)/categories/categories-client.tsx`
  - `src/app/(admin)/dashboard/page.tsx`
  - `src/app/(admin)/products/products-client.tsx`
  - `src/app/(admin)/shifts/shifts-client.tsx`
  - `src/app/(admin)/stock-movements/stock-movements-client.tsx`
  - `src/app/(admin)/transactions/page.tsx`
  - `src/app/(admin)/transactions/transactions-client.tsx`
  - `src/app/(admin)/users/users-client.tsx`
  - `src/app/api/upload/route.ts`
  - `src/app/forgot-password/page.tsx`
  - `src/app/pos/pos-terminal.tsx`
  - `src/app/receipt/[id]/page.tsx`
  - `src/app/receipt/[id]/receipt-client.tsx`

**Interfaces:**
- Produces: Type-safe Next.js pages and API routes without unused variables or implicit anys.

- [ ] **Step 1: Check Pages and Layouts**
Fix `any` types and remove unused variables mentioned in the baseline errors. Check if pages properly enforce authentication via Supabase (either in middleware or server component).

- [ ] **Step 2: Check Client Components (`-client.tsx`)**
Fix `any` types in components. These mostly stem from `DataTable` column definitions or loosely typed event handlers.

- [ ] **Step 3: Document findings and apply fixes for Task 4**
Write down any bugs or architecture violations found. Apply fixes directly to the files.

## Global Constraints

- **No client secrets in frontend.**
- **Ponytail mode.** Keep changes minimal. Don't refactor for the sake of refactoring. Fix the warnings/errors and move on.
