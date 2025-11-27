-- CreateTable
CREATE TABLE "Yape_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payer_name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "raw_text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    "match_confidence" REAL,
    "order_id" INTEGER,
    "assigned_by" TEXT,
    "assigned_at" DATETIME,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    CONSTRAINT "Yape_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Yape_payments_order_id_idx" ON "Yape_payments"("order_id");

-- CreateIndex
CREATE INDEX "Yape_payments_status_idx" ON "Yape_payments"("status");

-- CreateIndex
CREATE INDEX "Yape_payments_received_at_idx" ON "Yape_payments"("received_at");
