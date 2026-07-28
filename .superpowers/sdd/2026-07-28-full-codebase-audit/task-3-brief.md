# Task 3: Audit UI Components

**Files:**
- Audit: `src/components/pos/`
- Audit: `src/components/ui/` (shadcn wrappers and standard UI parts)
- Focus specifically on files that threw warnings or errors during the baseline test (e.g., `product-card.tsx`, `cart-line-item.tsx`, `data-table.tsx`, `animated-toast.tsx`).

**Interfaces:**
- Produces: Polished, error-free React components.

- [ ] **Step 1: Check `src/components/pos/`**
Fix `<img>` elements to use `next/image` as warned by the linter, or silence the linter if external URLs require `<img>`. Fix any `any` types.

- [ ] **Step 2: Check `src/components/ui/`**
Fix the `any` types in `data-table.tsx`. Remove unused variables in `animated-toast.tsx`.

- [ ] **Step 3: Document findings and apply fixes for Task 3**
Write down any bugs or architecture violations found. Apply fixes directly to the files.

## Global Constraints

- **No client secrets in frontend.**
- **Ponytail mode.** Keep changes minimal. Don't refactor for the sake of refactoring. Fix the warnings/errors and move on.
