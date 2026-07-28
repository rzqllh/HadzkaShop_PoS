# Task 2: Audit Backend API & tRPC Routers

**Files:**
- Audit: `src/server/api/trpc.ts` (Core tRPC context)
- Audit: `src/server/api/root.ts`
- Audit: All routers in `src/server/api/routers/` (auth, products, transactions, stock, etc.)

**Interfaces:**
- Produces: Validated, secure, and type-safe tRPC endpoints.

- [ ] **Step 1: Audit tRPC Context & Middleware (`trpc.ts`)**
Check how context is built and how authorization middleware is enforced.

- [ ] **Step 2: Audit Routers (`src/server/api/routers/`)**
For every router:
- Are all inputs properly validated with Zod?
- Is `shopId` being extracted from the session and used in `where` clauses securely? (No client-provided `shopId`!).
- Are stock operations wrapped in `$transaction` where necessary?
- Fix the `any` types that the baseline tests warned about.

- [ ] **Step 3: Document findings and apply fixes for Task 2**
Write down any bugs or architecture violations found. Apply fixes directly to the files.

## Global Constraints

- **No client secrets in frontend.**
- **No client-provided `shopId`.** The server must determine `shopId` from the authenticated user's session.
- **Atomic stock operations.** 
