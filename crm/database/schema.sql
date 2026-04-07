-- ============================================================
-- Bimano CRM — Database Schema
-- Site: bimanofinancials.com
-- DB:   u710294496_crm_db
-- ============================================================
-- PREFERRED: run setup.php — it re-hashes passwords on the
-- server with PHP's password_hash(). Use this SQL only for
-- a clean import via phpMyAdmin.
-- ============================================================

CREATE DATABASE IF NOT EXISTS `u710294496_crm_db`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `u710294496_crm_db`;

-- ── Users table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `users` (
    `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100)     NOT NULL,
    `email`      VARCHAR(254)     NOT NULL,
    `password`   VARCHAR(255)     NOT NULL  COMMENT 'bcrypt hash only — no MD5/plain text',
    `role`       ENUM('admin','employee','client')
                                  NOT NULL DEFAULT 'employee',
    `created_at` TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── Admin user ────────────────────────────────────────────────
--
-- Email    : mostafizur660894@gmail.com
-- Password : Rakib@9101#
-- Hash     : bcrypt cost=12, verified
--
-- NOTE: The existing row has an MD5 hash which breaks login.
-- This INSERT uses ON DUPLICATE KEY UPDATE to fix it automatically.

INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
(
    'Admin',
    'mostafizur660894@gmail.com',
    '$2a$12$QjSESytJ4Bate2HthSFDJ.wA5ZWdSTmt.S2Bt4hLXMz0vV.YF5XCy',
    'admin'
)
ON DUPLICATE KEY UPDATE
    `password` = VALUES(`password`),
    `name`     = VALUES(`name`),
    `role`     = VALUES(`role`);

-- ── To reset password later ───────────────────────────────────
-- On your server terminal:
--   php -r "echo password_hash('NewPassword', PASSWORD_BCRYPT, ['cost'=>12]);"
-- Then in phpMyAdmin:
--   UPDATE users SET password='<new_hash>' WHERE email='mostafizur660894@gmail.com';

-- ── Branches table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `branches` (
    `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100)     NOT NULL,
    `location`   VARCHAR(255)     NULL,
    `is_active`  TINYINT(1)       NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_branches_name` (`name`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── Categories table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `categories` (
    `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100)     NOT NULL,
    `description` TEXT            NULL,
    `is_active`  TINYINT(1)       NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_categories_name` (`name`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── Leads table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `leads` (
    `id`          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100)     NOT NULL,
    `email`       VARCHAR(254)     NULL,
    `phone`       VARCHAR(20)      NOT NULL,
    `company`     VARCHAR(150)     NULL,
    `source`      VARCHAR(50)      NULL,
    `status`      ENUM('new','contacted','qualified','converted','lost')
                                   NOT NULL DEFAULT 'new',
    `notes`       TEXT             NULL,
    `category_id` INT UNSIGNED     NULL,
    `branch_id`   INT UNSIGNED     NOT NULL DEFAULT 1,
    `assigned_to` INT UNSIGNED     NULL,
    `created_by`  INT UNSIGNED     NULL,
    `created_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_leads_phone_branch` (`phone`, `branch_id`),
    INDEX `idx_leads_status` (`status`),
    INDEX `idx_leads_branch` (`branch_id`),
    INDEX `idx_leads_category` (`category_id`),
    INDEX `idx_leads_assigned` (`assigned_to`),
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── Clients table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `clients` (
    `id`          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100)     NOT NULL,
    `email`       VARCHAR(254)     NULL,
    `phone`       VARCHAR(20)      NOT NULL,
    `company`     VARCHAR(150)     NULL,
    `address`     TEXT             NULL,
    `status`      ENUM('active','inactive','suspended')
                                   NOT NULL DEFAULT 'active',
    `category_id` INT UNSIGNED     NULL,
    `branch_id`   INT UNSIGNED     NOT NULL DEFAULT 1,
    `assigned_to` INT UNSIGNED     NULL,
    `lead_id`     INT UNSIGNED     NULL,
    `created_by`  INT UNSIGNED     NULL,
    `created_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_clients_phone_branch` (`phone`, `branch_id`),
    INDEX `idx_clients_status` (`status`),
    INDEX `idx_clients_branch` (`branch_id`),
    INDEX `idx_clients_category` (`category_id`),
    INDEX `idx_clients_assigned` (`assigned_to`),
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── Tasks table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `tasks` (
    `id`          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `title`       VARCHAR(200)     NOT NULL,
    `description` TEXT             NULL,
    `status`      ENUM('pending','in_progress','completed','cancelled')
                                   NOT NULL DEFAULT 'pending',
    `priority`    ENUM('low','medium','high')
                                   NOT NULL DEFAULT 'medium',
    `due_date`    DATE             NULL,
    `assigned_to` INT UNSIGNED     NULL,
    `lead_id`     INT UNSIGNED     NULL,
    `client_id`   INT UNSIGNED     NULL,
    `branch_id`   INT UNSIGNED     NOT NULL DEFAULT 1,
    `created_by`  INT UNSIGNED     NULL,
    `created_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_tasks_status` (`status`),
    INDEX `idx_tasks_assigned` (`assigned_to`),
    INDEX `idx_tasks_due_date` (`due_date`),
    FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── Follow-ups table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `followups` (
    `id`          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `subject`     VARCHAR(200)     NOT NULL,
    `notes`       TEXT             NULL,
    `scheduled_at` DATETIME        NOT NULL,
    `completed_at` DATETIME        NULL,
    `status`      ENUM('pending','completed','cancelled')
                                   NOT NULL DEFAULT 'pending',
    `lead_id`     INT UNSIGNED     NULL,
    `client_id`   INT UNSIGNED     NULL,
    `assigned_to` INT UNSIGNED     NULL,
    `created_by`  INT UNSIGNED     NULL,
    `created_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_followups_status` (`status`),
    INDEX `idx_followups_scheduled` (`scheduled_at`),
    FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── Notes table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `notes` (
    `id`          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    `content`     TEXT             NOT NULL,
    `lead_id`     INT UNSIGNED     NULL,
    `client_id`   INT UNSIGNED     NULL,
    `task_id`     INT UNSIGNED     NULL,
    `created_by`  INT UNSIGNED     NULL,
    `created_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_notes_lead` (`lead_id`),
    INDEX `idx_notes_client` (`client_id`),
    INDEX `idx_notes_task` (`task_id`),
    FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


