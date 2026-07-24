# Architecture — Hadzka Shop POS

> Fill this in before writing any code. Read this file before scaffolding anything new.

## Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Framework** | Next.js 15 (App Router) | Full-stack React — server components for admin/reports, client components for the cashier interface. API routes for Midtrans webhooks. |
| **Language** | TypeScript (strict) | Type safety across client and server. Non-negotiable. |
| **Database** | PostgreSQL (via Supabase or Neon) | Relational data (products, transactions, line items, users) with strong consistency. ACID transactions for stock decrements. |
| **ORM** | Prisma | Type-safe DB access, migrations, schema-as-code. |
| **Auth** | NextAuth.js (Auth.js v5) | Simple credential-based auth (email + password). Two roles: Owner, Cashier. |
| **Payment** | Midtrans Snap (server-side token creation, client-side popup) | QRIS via Snap checkout. Server-side webhook for payment confirmation. |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Utility-first CSS with accessible component primitives. POS-optimized theme. |
| **PDF** | @react-pdf/renderer or jsPDF | Client-side PDF receipt generation. |
| **Package Manager** | pnpm | Fast, disk-efficient, strict dependency resolution. |
| **Hosting** | Vercel (default) | Zero-config Next.js deployment. Can be changed later. |

## Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, etc.)
│   │   └── login/
│   ├── (dashboard)/              # Authenticated routes
│   │   ├── pos/                  # Cashier POS interface (main transaction screen)
│   │   ├── products/             # Product management (Owner)
│   │   ├── reports/              # Sales reports (Owner)
│   │   ├── settings/             # Shop settings (Owner)
│   │   ├── users/                # User management (Owner)
│   │   └── till/                 # Till closing flow
│   ├── api/
│   │   ├── midtrans/
│   │   │   └── webhook/          # Midtrans notification handler
│   │   └── trpc/                 # tRPC API handler (if used)
│   ├── layout.tsx
│   └── page.tsx                  # Redirect to /pos or /login
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── pos/                      # POS-specific components (cart, product grid, payment modal)
│   ├── products/                 # Product management components
│   ├── reports/                  # Report components (charts, tables)
│   └── shared/                   # Shared components (header, sidebar, etc.)
│
├── lib/
│   ├── db/                       # Prisma client, query helpers
│   ├── midtrans/                 # Midtrans client, webhook verification, types
│   ├── auth/                     # Auth config, session helpers
│   ├── pdf/                      # Receipt PDF generation
│   ├── validators/               # Zod schemas for input validation
│   └── utils/                    # General utilities (currency formatting, etc.)
│
├── hooks/                        # Custom React hooks
│   ├── use-cart.ts               # Cart state management
│   ├── use-retry-buffer.ts       # Client-side retry buffer for in-flight transactions
│   └── ...
│
├── stores/                       # Client-side state (Zustand)
│   └── cart-store.ts             # Cart state — products, quantities, discount, tax
│
├── types/                        # Shared TypeScript types
│
└── prisma/
    ├── schema.prisma             # Database schema
    └── migrations/               # Prisma migrations
```

## Data Model

### Shop
- `id` (UUID, PK)
- `name` (string)
- `address` (string, nullable)
- `phone` (string, nullable)
- `taxRate` (decimal, default 0) — PPN percentage, configurable
- `currency` (string, default "IDR")
- `lowStockThreshold` (int, default 10) — global default
- `receiptHeader` (text, nullable) — custom receipt header
- `receiptFooter` (text, nullable) — custom receipt footer
- `createdAt`, `updatedAt`

### User
- `id` (UUID, PK)
- `shopId` (FK → Shop)
- `name` (string)
- `email` (string, unique)
- `passwordHash` (string)
- `role` (enum: OWNER, CASHIER)
- `isActive` (boolean, default true)
- `createdAt`, `updatedAt`

### Category
- `id` (UUID, PK)
- `shopId` (FK → Shop)
- `name` (string)
- `sortOrder` (int, default 0)
- `createdAt`, `updatedAt`

### Product
- `id` (UUID, PK)
- `shopId` (FK → Shop)
- `categoryId` (FK → Category, nullable)
- `name` (string)
- `sku` (string, unique per shop)
- `barcode` (string, nullable)
- `price` (decimal) — selling price in IDR
- `costPrice` (decimal, nullable) — purchase price, for future margin reports
- `stock` (int)
- `lowStockThreshold` (int, nullable) — per-product override, falls back to shop default
- `imageUrl` (string, nullable)
- `isActive` (boolean, default true)
- `createdAt`, `updatedAt`

### Transaction
- `id` (UUID, PK)
- `shopId` (FK → Shop)
- `cashierId` (FK → User)
- `transactionNumber` (string, unique) — human-readable sequential number
- `status` (enum: PENDING, COMPLETED, CANCELLED)
- `paymentMethod` (enum: CASH, QRIS)
- `subtotal` (decimal) — sum of line items before discount/tax
- `discountType` (enum: PERCENTAGE, FIXED, nullable)
- `discountValue` (decimal, nullable) — the % or fixed amount entered
- `discountAmount` (decimal) — calculated discount in IDR
- `taxRate` (decimal) — snapshot of shop tax rate or manual override at transaction time
- `taxAmount` (decimal) — calculated tax in IDR
- `shippingCost` (decimal, default 0) — manually entered shipping/ongkir (optional)
- `total` (decimal) — final amount after discount, tax, and shipping
- `cashTendered` (decimal, nullable) — for cash payments
- `cashChange` (decimal, nullable) — calculated change
- `midtransOrderId` (string, nullable) — Midtrans order reference
- `midtransTransactionId` (string, nullable) — Midtrans transaction reference
- `midtransStatus` (string, nullable) — latest Midtrans status
- `completedAt` (datetime, nullable)
- `createdAt`, `updatedAt`

### TransactionItem
- `id` (UUID, PK)
- `transactionId` (FK → Transaction)
- `productId` (FK → Product)
- `productName` (string) — snapshot at transaction time
- `productSku` (string) — snapshot at transaction time
- `unitPrice` (decimal) — snapshot at transaction time
- `quantity` (int)
- `lineTotal` (decimal) — unitPrice × quantity
- `createdAt`

### StockAdjustment
- `id` (UUID, PK)
- `shopId` (FK → Shop)
- `productId` (FK → Product)
- `userId` (FK → User) — who made the adjustment
- `type` (enum: ADD, SUBTRACT)
- `quantity` (int)
- `reason` (string) — e.g. "Received shipment", "Damaged goods"
- `previousStock` (int) — stock before adjustment
- `newStock` (int) — stock after adjustment
- `createdAt`

### TillSession
- `id` (UUID, PK)
- `shopId` (FK → Shop)
- `cashierId` (FK → User)
- `openedAt` (datetime)
- `closedAt` (datetime, nullable)
- `startingCash` (decimal)
- `expectedCash` (decimal, nullable) — calculated: startingCash + cash sales
- `actualCash` (decimal, nullable) — cashier-declared amount
- `difference` (decimal, nullable) — actual - expected
- `notes` (text, nullable)
- `status` (enum: OPEN, CLOSED)

## API Contracts

### Transactions

#### POST /api/transactions
- **Purpose:** Create a new transaction (checkout)
- **Request body:**
  ```json
  {
    "items": [{ "productId": "uuid", "quantity": 1 }],
    "paymentMethod": "CASH" | "QRIS",
    "discountType": "PERCENTAGE" | "FIXED" | null,
    "discountValue": 10,
    "cashTendered": 50000
  }
  ```
- **Response:** Transaction object with status, totals, change (for cash), or Midtrans snap token (for QRIS).
- **Auth required:** Yes (Cashier or Owner)
- **Critical behavior:**
  - Validates stock availability before processing.
  - Decrements stock atomically in a DB transaction.
  - Snapshots product prices, tax rate at transaction time.
  - For QRIS: creates Midtrans Snap token, returns it. Transaction stays PENDING until webhook confirms.

#### POST /api/midtrans/webhook
- **Purpose:** Receive Midtrans payment notifications.
- **Auth:** Signature verification (Midtrans server key).
- **Critical behavior:**
  - Verify notification authenticity before mutating state.
  - Idempotent: re-processing the same notification must not double-process.
  - Monotonic: late `pending` or `cancelled` must not overwrite `settlement`.
  - Return 200 after safe acceptance.

### Products

#### GET /api/products
- Query params: `search`, `categoryId`, `page`, `limit`
- **Auth:** Cashier or Owner

#### POST /api/products
- **Auth:** Owner only

#### PUT /api/products/:id
- **Auth:** Owner only

### Reports

#### GET /api/reports/daily?date=YYYY-MM-DD
- **Auth:** Owner only

#### GET /api/reports/monthly?year=YYYY&month=MM
- **Auth:** Owner only

### Till

#### POST /api/till/open
- Body: `{ "startingCash": 200000 }`
- **Auth:** Cashier or Owner

#### POST /api/till/close
- Body: `{ "actualCash": 550000, "notes": "..." }`
- **Auth:** Cashier or Owner

## Third-party Integrations

### Midtrans
- **Purpose:** QRIS payment processing via Snap checkout.
- **Product:** Snap (popup mode) — server creates token, client opens Snap popup.
- **Env vars:**
  - `MIDTRANS_SERVER_KEY` — for Snap token creation and webhook signature verification
  - `MIDTRANS_CLIENT_KEY` — for Snap.js on the client
  - `MIDTRANS_IS_PRODUCTION` — boolean, sandbox vs production
  - `MIDTRANS_MERCHANT_ID` — merchant identifier
- **Webhook URL:** `{BASE_URL}/api/midtrans/webhook` — must be publicly reachable HTTPS.
- **Key rules (from Midtrans skill):**
  - `gross_amount` is integer when creating Snap token, raw string when verifying signature.
  - Callbacks are idempotent and monotonic.
  - Keep all keys and signature verification server-side.

## Non-negotiables

1. **No client secrets in frontend.** Midtrans server key, DB credentials, auth secrets — server-side only.
2. **No raw SQL outside `lib/db/`.** All database access goes through Prisma. If raw SQL is ever needed, it lives in `lib/db/`.
3. **No hardcoded business values.** Tax rates, shop info, discount limits, receipt templates — all from database/config.
4. **Atomic stock operations.** Stock decrements happen inside a database transaction with the sale creation. No race conditions.
5. **Snapshot transactional data.** Product name, price, SKU, and tax rate are copied into the transaction record at sale time. Changing a product's price later must not alter historical receipts.
6. **No new dependency without checking bundle impact.** Run `pnpm why <package>` and check the size before adding.
7. **`shopId` on every business entity.** Even though we have one shop, every table that holds business data has a `shopId` FK. No global singletons.
