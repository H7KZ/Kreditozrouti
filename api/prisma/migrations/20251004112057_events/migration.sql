-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `title` VARCHAR(255) NULL,
    `subtitle` VARCHAR(255) NULL,
    `datetime` DATETIME(3) NULL,
    `imageSrc` VARCHAR(255) NULL,
    `imageAlt` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `place` VARCHAR(255) NULL,
    `author` VARCHAR(255) NULL,
    `language` VARCHAR(4) NULL,
    `registrationFrom` DATETIME(3) NULL,
    `registrationUrl` VARCHAR(255) NULL,
    `substituteUrl` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events_categories` (
    `eventId` VARCHAR(255) NOT NULL,
    `categoryId` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`eventId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_EventCategories` (
    `A` VARCHAR(255) NOT NULL,
    `B` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `_EventCategories_AB_unique`(`A`, `B`),
    INDEX `_EventCategories_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `events_categories` ADD CONSTRAINT `events_categories_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events_categories` ADD CONSTRAINT `events_categories_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EventCategories` ADD CONSTRAINT `_EventCategories_A_fkey` FOREIGN KEY (`A`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EventCategories` ADD CONSTRAINT `_EventCategories_B_fkey` FOREIGN KEY (`B`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
