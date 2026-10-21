-- AlterTable: allow daily goals (Coding Tracker "Set goal")
ALTER TABLE `goals` MODIFY `period` ENUM('day', 'week', 'month', 'year') NOT NULL;

-- CreateTable
CREATE TABLE `coding_breakdowns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `log_date` DATE NOT NULL,
    `kind` ENUM('project', 'language', 'editor', 'category') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `seconds` INTEGER NOT NULL,

    INDEX `coding_breakdowns_user_id_kind_log_date_idx`(`user_id`, `kind`, `log_date`),
    UNIQUE INDEX `coding_breakdowns_user_id_log_date_kind_name_key`(`user_id`, `log_date`, `kind`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `coding_breakdowns` ADD CONSTRAINT `coding_breakdowns_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
