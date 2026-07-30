ALTER TYPE "TransactionStatus" ADD VALUE 'CREATING_PAYMENT';
ALTER TYPE "TransactionStatus" ADD VALUE 'FAILED';

DROP INDEX "Transaction_transactionNumber_key";
DROP INDEX "Transaction_shopId_idx";

ALTER TABLE "Shop"
ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Asia/Jakarta';

ALTER TABLE "User"
ADD COLUMN "authUserId" UUID;

ALTER TABLE "Product"
ADD COLUMN "reservedStock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Transaction"
ADD COLUMN "businessDate" DATE,
ADD COLUMN "clientRequestId" UUID,
ADD COLUMN "discountType" "DiscountType",
ADD COLUMN "discountValue" DECIMAL(12,2),
ADD COLUMN "midtransSnapToken" TEXT,
ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

UPDATE "Transaction" AS transaction
SET "businessDate" = (transaction."createdAt" AT TIME ZONE shop."timeZone")::date
FROM "Shop" AS shop
WHERE transaction."shopId" = shop."id";

ALTER TABLE "Transaction"
ALTER COLUMN "businessDate" SET NOT NULL,
ALTER COLUMN "businessDate" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "TransactionCounter" (
    "shopId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TransactionCounter_pkey" PRIMARY KEY ("shopId", "businessDate")
);

INSERT INTO "TransactionCounter" ("shopId", "businessDate", "lastValue")
SELECT
    "shopId",
    "businessDate",
    GREATEST(
        COUNT(*)::INTEGER,
        COALESCE(
            MAX(
                CASE
                    WHEN "transactionNumber" ~ '[0-9]+$'
                    THEN substring("transactionNumber" FROM '([0-9]+)$')::INTEGER
                END
            ),
            0
        )
    )
FROM "Transaction"
GROUP BY "shopId", "businessDate";

CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");
CREATE INDEX "Product_shopId_isActive_idx" ON "Product"("shopId", "isActive");
CREATE UNIQUE INDEX "Transaction_midtransOrderId_key" ON "Transaction"("midtransOrderId");
CREATE UNIQUE INDEX "Transaction_midtransTransactionId_key" ON "Transaction"("midtransTransactionId");
CREATE INDEX "Transaction_shopId_businessDate_idx" ON "Transaction"("shopId", "businessDate");
CREATE INDEX "Transaction_shopId_status_createdAt_idx" ON "Transaction"("shopId", "status", "createdAt");
CREATE INDEX "Transaction_cashierId_idx" ON "Transaction"("cashierId");
CREATE INDEX "Transaction_customerId_idx" ON "Transaction"("customerId");
CREATE UNIQUE INDEX "Transaction_shopId_transactionNumber_key" ON "Transaction"("shopId", "transactionNumber");
CREATE UNIQUE INDEX "Transaction_shopId_clientRequestId_key" ON "Transaction"("shopId", "clientRequestId");
CREATE INDEX "TransactionItem_productId_idx" ON "TransactionItem"("productId");
CREATE INDEX "StockMovement_userId_idx" ON "StockMovement"("userId");
CREATE INDEX "StockMovement_referenceId_idx" ON "StockMovement"("referenceId");
CREATE UNIQUE INDEX "StockMovement_referenceId_productId_type_key" ON "StockMovement"("referenceId", "productId", "type");

ALTER TABLE "TransactionCounter"
ADD CONSTRAINT "TransactionCounter_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Shop"
ADD CONSTRAINT "Shop_taxRate_check" CHECK ("taxRate" >= 0 AND "taxRate" <= 100),
ADD CONSTRAINT "Shop_lowStockThreshold_check" CHECK ("lowStockThreshold" >= 0);

ALTER TABLE "Product"
ADD CONSTRAINT "Product_price_check" CHECK ("price" >= 0),
ADD CONSTRAINT "Product_costPrice_check" CHECK ("costPrice" IS NULL OR "costPrice" >= 0),
ADD CONSTRAINT "Product_stock_check" CHECK ("stock" >= 0),
ADD CONSTRAINT "Product_reservedStock_check" CHECK ("reservedStock" >= 0 AND "reservedStock" <= "stock"),
ADD CONSTRAINT "Product_lowStockThreshold_check" CHECK ("lowStockThreshold" IS NULL OR "lowStockThreshold" >= 0);

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_loyaltyPoints_check" CHECK ("loyaltyPoints" >= 0),
ADD CONSTRAINT "Customer_totalSpent_check" CHECK ("totalSpent" >= 0);

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_subtotal_check" CHECK ("subtotal" >= 0),
ADD CONSTRAINT "Transaction_discountAmount_check" CHECK ("discountAmount" >= 0),
ADD CONSTRAINT "Transaction_discountValue_check" CHECK ("discountValue" IS NULL OR "discountValue" >= 0),
ADD CONSTRAINT "Transaction_taxRate_check" CHECK ("taxRate" >= 0 AND "taxRate" <= 100),
ADD CONSTRAINT "Transaction_taxAmount_check" CHECK ("taxAmount" >= 0),
ADD CONSTRAINT "Transaction_shippingCost_check" CHECK ("shippingCost" >= 0),
ADD CONSTRAINT "Transaction_total_check" CHECK ("total" >= 0),
ADD CONSTRAINT "Transaction_amountPaid_check" CHECK ("amountPaid" >= 0),
ADD CONSTRAINT "Transaction_changeDue_check" CHECK ("changeDue" >= 0);

ALTER TABLE "TransactionItem"
ADD CONSTRAINT "TransactionItem_unitPrice_check" CHECK ("unitPrice" >= 0),
ADD CONSTRAINT "TransactionItem_costPrice_check" CHECK ("costPrice" IS NULL OR "costPrice" >= 0),
ADD CONSTRAINT "TransactionItem_quantity_check" CHECK ("quantity" > 0),
ADD CONSTRAINT "TransactionItem_subtotal_check" CHECK ("subtotal" >= 0);

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_quantity_check" CHECK ("quantity" > 0),
ADD CONSTRAINT "StockMovement_previousStock_check" CHECK ("previousStock" >= 0),
ADD CONSTRAINT "StockMovement_newStock_check" CHECK ("newStock" >= 0);

ALTER TABLE "TransactionCounter"
ADD CONSTRAINT "TransactionCounter_lastValue_check" CHECK ("lastValue" >= 0);

ALTER TABLE "Shop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransactionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransactionCounter" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    business_table TEXT;
BEGIN
    FOREACH business_table IN ARRAY ARRAY[
        'Shop',
        'User',
        'Category',
        'Product',
        'Customer',
        'Transaction',
        'TransactionItem',
        'StockMovement',
        'TransactionCounter'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', business_table);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', business_table);
        END IF;
    END LOOP;
END
$$;
