<?php
/**
 * One-Click Setup Script — Bimano CRM
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  HOSTINGER QUICK-START                                       ║
 * ║  1. Edit config.php  (DB credentials + CRM_BASE_PATH)        ║
 * ║  2. Upload the /crm/ folder to public_html/crm/             ║
 * ║  3. In hPanel → PHP Config → select PHP 8.0 or higher       ║
 * ║  4. Visit: https://yourdomain.com/crm/setup.php?token=      ║
 * ║            bimano-setup-2024                                 ║
 * ║  5. DELETE setup.php after a successful run                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── PHP version gate (plain PHP syntax — no strict_types yet) ────────────────
if (PHP_MAJOR_VERSION < 8) {
    http_response_code(500);
    $msg = 'Bimano CRM requires PHP 8.0 or later. '
         . 'Current version: ' . PHP_VERSION . '. '
         . 'Please upgrade in Hostinger hPanel → PHP Configuration.';
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, $msg . PHP_EOL);
    } else {
        header('Content-Type: text/plain; charset=utf-8');
        echo $msg;
    }
    exit(1);
}

// ── Access guard ──────────────────────────────────────────────────────────────

const SETUP_TOKEN = 'bimano-setup-2024'; // change before deploying

if (PHP_SAPI !== 'cli') {
    $token = $_GET['token'] ?? $_SERVER['HTTP_X_SETUP_TOKEN'] ?? '';
    if (!hash_equals(SETUP_TOKEN, $token)) {
        http_response_code(403);
        die('403 Forbidden — supply ?token=SETUP_TOKEN to run setup.');
    }
}

// ── Load config (DB credentials) ─────────────────────────────────────────────

require_once __DIR__ . '/config.php';

// ── Helpers ───────────────────────────────────────────────────────────────────

$log = [];

function log_line(string $icon, string $msg): void
{
    global $log;
    $line   = $icon . ' ' . $msg;
    $log[]  = $line;
    if (PHP_SAPI === 'cli') {
        echo $line . PHP_EOL;
    }
}

function run_sql(mysqli $conn, string $sql, string $label): void
{
    if ($conn->query($sql)) {
        log_line('✔', $label);
    } else {
        log_line('✘', $label . ' — ' . $conn->error);
    }
}

// ── Connect (without database selected first — it may not exist yet) ──────────

mysqli_report(MYSQLI_REPORT_OFF);
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, '', DB_PORT);

if ($conn->connect_errno) {
    $msg = 'Cannot connect to MySQL: ' . $conn->connect_error;
    log_line('✘', $msg);
    output_html($log, false);
    exit(1);
}

$conn->set_charset(DB_CHARSET);
log_line('✔', 'Connected to MySQL @ ' . DB_HOST);

// ── Create database ───────────────────────────────────────────────────────────

run_sql(
    $conn,
    'CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    'Database `' . DB_NAME . '` ready'
);

$conn->select_db(DB_NAME);

// ── Create / upgrade users table ──────────────────────────────────────────────

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `users` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100)  NOT NULL,
    `email`      VARCHAR(254)  NOT NULL,
    `password`   VARCHAR(255)  NOT NULL,
    `role`       ENUM('admin','sub_admin','employee','client') NOT NULL DEFAULT 'employee',
    `is_active`  TINYINT(1)    NOT NULL DEFAULT 1,
    `last_login` TIMESTAMP     NULL,
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `users` ready');

// Add columns that may be missing if table already existed (safe migration)
$migrations = [
    "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1"  => 'Column is_active',
    "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `last_login` TIMESTAMP NULL"                => 'Column last_login',
];
foreach ($migrations as $sql => $label) {
    if ($conn->query($sql)) {
        log_line('✔', $label . ' present');
    } else {
        // Column probably already exists in an older MySQL that doesn't support IF NOT EXISTS
        log_line('·', $label . ' skipped: ' . $conn->error);
    }
}

// ── Create all CRM tables ─────────────────────────────────────────────────────

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `branches` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100)  NOT NULL,
    `address`    TEXT,
    `city`       VARCHAR(100),
    `state`      VARCHAR(100),
    `phone`      VARCHAR(20),
    `email`      VARCHAR(150),
    `is_active`  TINYINT(1)    NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `branches` ready');

// Seed default branch
$conn->query("INSERT IGNORE INTO `branches` (`id`, `name`, `city`, `is_active`) VALUES (1, 'Main Branch', 'Dhaka', 1)");
log_line('✔', 'Default branch seeded');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `roles` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(50)   NOT NULL UNIQUE,
    `description` VARCHAR(255),
    `is_system`   TINYINT(1)    NOT NULL DEFAULT 0,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `roles` ready');

// Seed system roles
foreach ([
    [1, 'admin',     'System administrator',  1],
    [2, 'sub_admin', 'Branch manager',        1],
    [3, 'employee',  'Field employee',        1],
    [4, 'client',    'Client user',           1],
] as [$rid, $rname, $rdesc, $rsys]) {
    $conn->query("INSERT IGNORE INTO `roles` (`id`, `name`, `description`, `is_system`) VALUES ($rid, '$rname', '$rdesc', $rsys)");
}
log_line('✔', 'Roles seeded');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `categories` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100)  NOT NULL UNIQUE,
    `description` VARCHAR(255),
    `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `categories` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `leads` (
    `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`          VARCHAR(100)  NOT NULL,
    `email`         VARCHAR(150),
    `phone`         VARCHAR(20)   NOT NULL,
    `company`       VARCHAR(150),
    `source`        VARCHAR(50),
    `status`        ENUM('new','contacted','qualified','converted','lost') NOT NULL DEFAULT 'new',
    `category_id`   INT UNSIGNED,
    `branch_id`     INT UNSIGNED  NOT NULL DEFAULT 1,
    `assigned_to`   INT UNSIGNED,
    `notes`         TEXT,
    `created_by`    INT UNSIGNED,
    `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_status` (`status`),
    KEY `idx_branch` (`branch_id`),
    KEY `idx_assigned` (`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `leads` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `clients` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100)  NOT NULL,
    `email`       VARCHAR(150),
    `phone`       VARCHAR(20)   NOT NULL,
    `company`     VARCHAR(150),
    `address`     TEXT,
    `category_id` INT UNSIGNED,
    `branch_id`   INT UNSIGNED  NOT NULL DEFAULT 1,
    `assigned_to` INT UNSIGNED,
    `lead_id`     INT UNSIGNED,
    `status`      ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_by`  INT UNSIGNED,
    `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_branch` (`branch_id`),
    KEY `idx_assigned` (`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `clients` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `tasks` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `title`        VARCHAR(200)  NOT NULL,
    `description`  TEXT,
    `assigned_to`  INT UNSIGNED  NOT NULL,
    `assigned_by`  INT UNSIGNED  NOT NULL,
    `category_id`  INT UNSIGNED,
    `branch_id`    INT UNSIGNED  NOT NULL DEFAULT 1,
    `due_date`     DATE,
    `reminder_at`  DATETIME,
    `points`       INT           NOT NULL DEFAULT 0,
    `status`       ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
    `priority`     ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
    `completed_at` TIMESTAMP     NULL,
    `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_assigned` (`assigned_to`),
    KEY `idx_status` (`status`),
    KEY `idx_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `tasks` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `follow_ups` (
    `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `lead_id`       INT UNSIGNED,
    `client_id`     INT UNSIGNED,
    `assigned_to`   INT UNSIGNED  NOT NULL,
    `created_by`    INT UNSIGNED  NOT NULL,
    `followup_date` DATETIME      NOT NULL,
    `note`          TEXT,
    `status`        ENUM('pending','done','missed') NOT NULL DEFAULT 'pending',
    `branch_id`     INT UNSIGNED  NOT NULL DEFAULT 1,
    `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_assigned` (`assigned_to`),
    KEY `idx_date` (`followup_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `follow_ups` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `notes` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `content`      TEXT          NOT NULL,
    `notable_type` ENUM('task','lead','client') NOT NULL,
    `notable_id`   INT UNSIGNED  NOT NULL,
    `branch_id`    INT UNSIGNED  NOT NULL DEFAULT 1,
    `created_by`   INT UNSIGNED  NOT NULL,
    `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_notable` (`notable_type`, `notable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `notes` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `points_ledger` (
    `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `user_id`    INT UNSIGNED  NOT NULL,
    `task_id`    INT UNSIGNED,
    `points`     INT           NOT NULL,
    `reason`     VARCHAR(255),
    `branch_id`  INT UNSIGNED  NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `points_ledger` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `activity_logs` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `user_id`      INT UNSIGNED,
    `action`       VARCHAR(100)  NOT NULL,
    `module`       VARCHAR(50)   NOT NULL,
    `reference_id` INT UNSIGNED,
    `details`      JSON,
    `ip_address`   VARCHAR(45),
    `branch_id`    INT UNSIGNED,
    `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_date` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `activity_logs` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `notifications` (
    `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `user_id`        INT UNSIGNED  NOT NULL,
    `title`          VARCHAR(200)  NOT NULL,
    `message`        TEXT,
    `type`           VARCHAR(50),
    `reference_type` VARCHAR(50),
    `reference_id`   INT UNSIGNED,
    `is_read`        TINYINT(1)    NOT NULL DEFAULT 0,
    `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `notifications` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `employee_activities` (
    `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `employee_id`   INT UNSIGNED  NOT NULL,
    `lead_id`       INT UNSIGNED,
    `type`          ENUM('call','visit') NOT NULL,
    `points`        INT           NOT NULL DEFAULT 0,
    `branch_id`     INT UNSIGNED  NOT NULL DEFAULT 1,
    `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_employee` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `employee_activities` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `google_sheets` (
    `id`               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `sheet_url`        VARCHAR(500)  NOT NULL,
    `sheet_id`         VARCHAR(255)  NOT NULL,
    `sheet_name`       VARCHAR(200),
    `added_by`         INT UNSIGNED  NOT NULL,
    `last_imported_at` TIMESTAMP     NULL,
    `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `google_sheets` ready');

run_sql($conn, <<<SQL
CREATE TABLE IF NOT EXISTS `sheet_import_logs` (
    `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `sheet_id`       INT UNSIGNED  NOT NULL,
    `imported_by`    INT UNSIGNED  NOT NULL,
    `rows_imported`  INT           NOT NULL DEFAULT 0,
    `rows_skipped`   INT           NOT NULL DEFAULT 0,
    `errors`         TEXT,
    `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL, 'Table `sheet_import_logs` ready');

// Add extra columns to users if missing (fails silently if already exist)
$userCols = [
    "ALTER TABLE `users` ADD COLUMN `role_id` INT UNSIGNED NULL AFTER `role`"     => 'users.role_id',
    "ALTER TABLE `users` ADD COLUMN `branch_id` INT UNSIGNED NULL AFTER `role_id`" => 'users.branch_id',
    "ALTER TABLE `users` ADD COLUMN `is_super` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`" => 'users.is_super',
    "ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) NULL AFTER `email`"       => 'users.phone',
];
foreach ($userCols as $sql => $label) {
    if ($conn->query($sql)) {
        log_line('✔', $label . ' added');
    } else {
        log_line('·', $label . ' already exists');
    }
}

// Set role_id for existing users based on their role column
$conn->query("UPDATE `users` SET `role_id` = 1 WHERE `role` = 'admin'   AND (`role_id` IS NULL OR `role_id` = 0)");
$conn->query("UPDATE `users` SET `role_id` = 2 WHERE `role` = 'sub_admin' AND (`role_id` IS NULL OR `role_id` = 0)");
$conn->query("UPDATE `users` SET `role_id` = 3 WHERE `role` = 'employee' AND (`role_id` IS NULL OR `role_id` = 0)");
$conn->query("UPDATE `users` SET `role_id` = 4 WHERE `role` = 'client'   AND (`role_id` IS NULL OR `role_id` = 0)");
log_line('✔', 'users.role_id sync done');

// ── Seed demo users ───────────────────────────────────────────────────────────

$demo = [
    // Real admin — matches existing DB row; password fixed from MD5 → bcrypt
    ['Admin', 'mostafizur660894@gmail.com', 'Rakib@9101#', 'admin'],
];

$stmt = $conn->prepare(
    'INSERT INTO `users` (`name`, `email`, `password`, `role`)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE `password` = VALUES(`password`), `name` = VALUES(`name`)'
);

if (!$stmt) {
    log_line('✘', 'Prepare failed: ' . $conn->error);
} else {
    foreach ($demo as [$name, $email, $plainPassword, $role]) {
        $hash = password_hash($plainPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt->bind_param('ssss', $name, $email, $hash, $role);
        if ($stmt->execute()) {
            log_line('✔', "User seeded: {$email} ({$role}) / password: {$plainPassword}");
        } else {
            log_line('✘', "Failed to seed {$email}: " . $stmt->error);
        }
    }
    $stmt->close();
}

$conn->close();

// ── Output ────────────────────────────────────────────────────────────────────

if (PHP_SAPI === 'cli') {
    echo PHP_EOL . 'Setup complete. DELETE this file: setup.php' . PHP_EOL;
    exit(0);
}

output_html($log, true);

function output_html(array $log, bool $success): void
{
    $title = $success ? 'Setup Complete' : 'Setup Failed';
    $color = $success ? '#16a34a' : '#dc2626';
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?> — Bimano CRM</title>
<style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; padding: 2rem; }
    h1   { color: <?= $color ?>; margin-bottom: 1rem; }
    pre  { background: #1e293b; color: #e2e8f0; padding: 1.5rem; border-radius: 8px;
           font-size: .9rem; line-height: 1.7; white-space: pre-wrap; }
    .warn { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;
            padding: 1rem 1.25rem; margin-top: 1.5rem; color: #92400e; font-size: .9rem; }
</style>
</head>
<body>
<h1><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></h1>
<pre><?= htmlspecialchars(implode("\n", $log), ENT_QUOTES, 'UTF-8') ?></pre>
<?php if ($success): ?>
<div class="warn">
    <strong>&#9888; Action required:</strong> Delete <code>setup.php</code> from your server immediately.
    This file must not be publicly accessible after setup.
</div>
<?php endif; ?>
</body>
</html>
    <?php
}
