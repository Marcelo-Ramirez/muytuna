-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "statusAccount" TEXT NOT NULL DEFAULT 'active',
    "role" TEXT NOT NULL DEFAULT 'cliente',
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "userNameGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Users" ("createdAt", "email", "emailVerified", "id", "image", "name", "password", "phone", "role", "statusAccount", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "userName") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "password", "phone", "role", "statusAccount", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "userName" FROM "Users";
DROP TABLE "Users";
ALTER TABLE "new_Users" RENAME TO "Users";
CREATE UNIQUE INDEX "Users_userName_key" ON "Users"("userName");
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
