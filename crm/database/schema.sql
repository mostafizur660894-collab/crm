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


