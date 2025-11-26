/*
  Warnings:

  - You are about to drop the `Order_clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sale_orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sale_products` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[barcode]` on the table `Product_batches` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product_batches" ADD COLUMN "barcode" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Order_clients";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Sale_orders";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Sale_products";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "channel" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_amount" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "unit_price" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Orders_user_id_idx" ON "Orders"("user_id");

-- CreateIndex
CREATE INDEX "Orders_status_idx" ON "Orders"("status");

-- CreateIndex
CREATE INDEX "Orders_channel_idx" ON "Orders"("channel");

-- CreateIndex
CREATE INDEX "Order_items_order_id_idx" ON "Order_items"("order_id");

-- CreateIndex
CREATE INDEX "Order_items_product_id_idx" ON "Order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_batches_barcode_key" ON "Product_batches"("barcode");
