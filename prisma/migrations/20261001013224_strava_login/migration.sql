/*
  Warnings:

  - A unique constraint covering the columns `[provider,provider_account_id]` on the table `oauth_connections` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `oauth_connections` ADD COLUMN `last_synced_at` DATETIME(3) NULL,
    ADD COLUMN `provider_account_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `email` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `oauth_connections_provider_provider_account_id_key` ON `oauth_connections`(`provider`, `provider_account_id`);
