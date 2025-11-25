/*
  Warnings:

  - You are about to drop the column `created_at` on the `Product_batches` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Product_batches` table. All the data in the column will be lost.
  - You are about to drop the column `batchId` on the `Product_movements` table. All the data in the column will be lost.
  - Added the required column `initialQuantity` to the `Product_batches` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" INTEGER NOT NULL,
    "batch_number" TEXT NOT NULL,
    "initialQuantity" REAL NOT NULL,
    "remaining" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "production_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATETIME,
    "updated_at" DATETIME NOT NULL,
    "notes" TEXT,
    CONSTRAINT "Product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product_batches" ("batch_number", "expiry_date", "id", "notes", "product_id", "production_date", "remaining", "updated_at") SELECT "batch_number", "expiry_date", "id", "notes", "product_id", "production_date", "remaining", "updated_at" FROM "Product_batches";
DROP TABLE "Product_batches";
ALTER TABLE "new_Product_batches" RENAME TO "Product_batches";
CREATE UNIQUE INDEX "Product_batches_batch_number_key" ON "Product_batches"("batch_number");
CREATE INDEX "Product_batches_product_id_expiry_date_idx" ON "Product_batches"("product_id", "expiry_date");
CREATE INDEX "Product_batches_product_id_remaining_idx" ON "Product_batches"("product_id", "remaining");
CREATE TABLE "new_Product_movements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "movement_type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "Product_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product_movements" ("createdAt", "id", "movement_type", "product_id", "quantity", "user_id") SELECT "createdAt", "id", "movement_type", "product_id", "quantity", "user_id" FROM "Product_movements";
DROP TABLE "Product_movements";
ALTER TABLE "new_Product_movements" RENAME TO "Product_movements";
CREATE INDEX "Product_movements_product_id_idx" ON "Product_movements"("product_id");
CREATE INDEX "Product_movements_batch_id_idx" ON "Product_movements"("batch_id");
CREATE TABLE "new_Products" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "flavor" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "pricePerUnit" REAL NOT NULL,
    "currentQuantity" REAL NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "barcodeFormat" TEXT DEFAULT 'CODE128',
    "last_sequence_number" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Products" ("barcode", "barcodeFormat", "createdAt", "currentQuantity", "flavor", "id", "imageUrl", "name", "pricePerUnit", "sku", "type", "updatedAt") SELECT "barcode", "barcodeFormat", "createdAt", "currentQuantity", "flavor", "id", "imageUrl", "name", "pricePerUnit", "sku", "type", "updatedAt" FROM "Products";
DROP TABLE "Products";
ALTER TABLE "new_Products" RENAME TO "Products";
CREATE UNIQUE INDEX "Products_sku_key" ON "Products"("sku");
CREATE UNIQUE INDEX "Products_barcode_key" ON "Products"("barcode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
