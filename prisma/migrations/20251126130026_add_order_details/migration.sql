-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "channel" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "contact_phone" TEXT,
    "shipping_address" TEXT,
    "payment_method" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "shipping_cost" REAL NOT NULL DEFAULT 0,
    "tax_amount" REAL NOT NULL DEFAULT 0,
    "total_amount" REAL NOT NULL DEFAULT 0,
    "order_number" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "paid_at" DATETIME,
    CONSTRAINT "Orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Orders" ("channel", "created_at", "id", "status", "total_amount", "updated_at", "user_id") SELECT "channel", "created_at", "id", "status", "total_amount", "updated_at", "user_id" FROM "Orders";
DROP TABLE "Orders";
ALTER TABLE "new_Orders" RENAME TO "Orders";
CREATE UNIQUE INDEX "Orders_order_number_key" ON "Orders"("order_number");
CREATE INDEX "Orders_user_id_idx" ON "Orders"("user_id");
CREATE INDEX "Orders_status_idx" ON "Orders"("status");
CREATE INDEX "Orders_channel_idx" ON "Orders"("channel");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
