-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product_movements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "movement_type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "batchId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Product_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product_movements" ("createdAt", "id", "movement_type", "product_id", "quantity", "user_id") SELECT "createdAt", "id", "movement_type", "product_id", "quantity", "user_id" FROM "Product_movements";
DROP TABLE "Product_movements";
ALTER TABLE "new_Product_movements" RENAME TO "Product_movements";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
