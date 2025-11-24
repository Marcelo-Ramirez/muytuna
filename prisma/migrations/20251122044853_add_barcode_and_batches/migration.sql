/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `Products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[barcode]` on the table `Products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Products" ADD COLUMN "barcode" TEXT;
ALTER TABLE "Products" ADD COLUMN "barcodeFormat" TEXT DEFAULT 'CODE128';
ALTER TABLE "Products" ADD COLUMN "sku" TEXT;

-- CreateTable
CREATE TABLE "Product_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" INTEGER NOT NULL,
    "batch_number" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "remaining" REAL NOT NULL,
    "production_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_batches_batch_number_key" ON "Product_batches"("batch_number");

-- CreateIndex
CREATE INDEX "Product_batches_product_id_expiry_date_idx" ON "Product_batches"("product_id", "expiry_date");

-- CreateIndex
CREATE INDEX "Product_batches_product_id_remaining_idx" ON "Product_batches"("product_id", "remaining");

-- CreateIndex
CREATE UNIQUE INDEX "Products_sku_key" ON "Products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Products_barcode_key" ON "Products"("barcode");
