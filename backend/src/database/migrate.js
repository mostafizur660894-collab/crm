const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger');

const TABLES = [
  // ─── BRANCHES ───
  `CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(150),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── ROLES ───
  `CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_system TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── PERMISSIONS ───
  `CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── ROLE_PERMISSIONS ───
  `CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    UNIQUE KEY unique_role_perm (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── USERS ───
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    branch_id INT,
    is_active TINYINT(1) DEFAULT 1,
    is_super TINYINT(1) DEFAULT 0,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── SUB ADMIN BRANCH ACCESS ───
  `CREATE TABLE IF NOT EXISTS user_branch_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    branch_id INT NOT NULL,
    UNIQUE KEY unique_user_branch (user_id, branch_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── CATEGORIES ───
  `CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── LEADS ───
  `CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20) NOT NULL,
    company VARCHAR(150),
    source VARCHAR(50),
    status ENUM('new','contacted','qualified','converted','lost') DEFAULT 'new',
    category_id INT,
    branch_id INT NOT NULL,
    assigned_to INT,
    notes TEXT,
    imported_from VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_phone_branch (phone, branch_id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── CLIENTS ───
  `CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20) NOT NULL,
    company VARCHAR(150),
    address TEXT,
    category_id INT,
    branch_id INT NOT NULL,
    assigned_to INT,
    lead_id INT,
    status ENUM('active','inactive') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_phone_branch (phone, branch_id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── TASKS ───
  `CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to INT NOT NULL,
    assigned_by INT NOT NULL,
    category_id INT,
    branch_id INT NOT NULL,
    due_date DATE,
    reminder_at DATETIME,
    points INT DEFAULT 0,
    status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
    priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── FOLLOW UPS ───
  `CREATE TABLE IF NOT EXISTS follow_ups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT,
    client_id INT,
    assigned_to INT NOT NULL,
    created_by INT NOT NULL,
    followup_date DATETIME NOT NULL,
    note TEXT,
    status ENUM('pending','done','missed') DEFAULT 'pending',
    branch_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── NOTES ───
  `CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    notable_type ENUM('task','lead','client') NOT NULL,
    notable_id INT NOT NULL,
    branch_id INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_notable (notable_type, notable_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── REQUESTS ───
  `CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('reassignment','help','other') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_id INT,
    requested_by INT NOT NULL,
    reviewed_by INT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    review_note TEXT,
    branch_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── POINTS LEDGER ───
  `CREATE TABLE IF NOT EXISTS points_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT,
    points INT NOT NULL,
    reason VARCHAR(255),
    branch_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── GOOGLE SHEETS ───
  `CREATE TABLE IF NOT EXISTS google_sheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sheet_url VARCHAR(500) NOT NULL,
    sheet_id VARCHAR(255) NOT NULL,
    sheet_name VARCHAR(200),
    added_by INT NOT NULL,
    last_imported_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── SHEET IMPORT LOG ───
  `CREATE TABLE IF NOT EXISTS sheet_import_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sheet_id INT NOT NULL,
    imported_by INT NOT NULL,
    rows_imported INT DEFAULT 0,
    rows_skipped INT DEFAULT 0,
    errors TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sheet_id) REFERENCES google_sheets(id) ON DELETE CASCADE,
    FOREIGN KEY (imported_by) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── NOTIFICATIONS ───
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    reference_type VARCHAR(50),
    reference_id INT,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── EMPLOYEE ACTIVITIES (call/visit tracking) ───
  `CREATE TABLE IF NOT EXISTS employee_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    lead_id INT,
    type ENUM('call','visit') NOT NULL,
    points INT NOT NULL DEFAULT 0,
    branch_id INT NOT NULL,
    import_log_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (import_log_id) REFERENCES sheet_import_logs(id) ON DELETE SET NULL,
    INDEX idx_employee_branch (employee_id, branch_id),
    INDEX idx_type (type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ─── ACTIVITY LOGS ───
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    reference_id INT,
    details JSON,
    ip_address VARCHAR(45),
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_module_action (module, action),
    INDEX idx_user_date (user_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// ─── PERFORMANCE INDEXES (safe to re-run) ───
const INDEXES = [
  // Leads
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_branch ON leads(branch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at)`,
  // Clients
  `CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(assigned_to)`,
  `CREATE INDEX IF NOT EXISTS idx_clients_branch ON clients(branch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)`,
  // Tasks
  `CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_branch ON tasks(branch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)`,
  // Follow-ups
  `CREATE INDEX IF NOT EXISTS idx_followups_assigned ON follow_ups(assigned_to)`,
  `CREATE INDEX IF NOT EXISTS idx_followups_branch ON follow_ups(branch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_followups_status ON follow_ups(status)`,
  `CREATE INDEX IF NOT EXISTS idx_followups_date ON follow_ups(followup_date)`,
  // Notifications
  `CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at)`,
  // Points ledger
  `CREATE INDEX IF NOT EXISTS idx_points_user ON points_ledger(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_points_branch ON points_ledger(branch_id)`,
  // Users
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`,
];

// ─── DEFAULT SEED DATA ───
const SEED_ROLES = [
  `INSERT IGNORE INTO roles (name, description, is_system) VALUES ('admin', 'System Administrator', 1)`,
  `INSERT IGNORE INTO roles (name, description, is_system) VALUES ('sub_admin', 'Sub Administrator', 1)`,
  `INSERT IGNORE INTO roles (name, description, is_system) VALUES ('employee', 'Employee', 1)`,
  `INSERT IGNORE INTO roles (name, description, is_system) VALUES ('client', 'Client Portal User', 1)`,
];

const SEED_PERMISSIONS = [
  // Users module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_users', 'users', 'View users list')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_users', 'users', 'Create new users')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('edit_users', 'users', 'Edit users')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_users', 'users', 'Delete users')`,

  // Branches module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_branches', 'branches', 'View branches')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_branches', 'branches', 'Create branches')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('edit_branches', 'branches', 'Edit branches')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_branches', 'branches', 'Delete branches')`,

  // Categories module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_categories', 'categories', 'View categories')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_categories', 'categories', 'Create categories')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('edit_categories', 'categories', 'Edit categories')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_categories', 'categories', 'Delete categories')`,

  // Leads module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_leads', 'leads', 'View leads')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_leads', 'leads', 'Create leads')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('edit_leads', 'leads', 'Edit leads')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_leads', 'leads', 'Delete leads')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('convert_leads', 'leads', 'Convert lead to client')`,

  // Clients module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_clients', 'clients', 'View clients')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_clients', 'clients', 'Create clients')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('edit_clients', 'clients', 'Edit clients')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_clients', 'clients', 'Delete clients')`,

  // Tasks module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_tasks', 'tasks', 'View tasks')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_tasks', 'tasks', 'Create tasks')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('edit_tasks', 'tasks', 'Edit tasks')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_tasks', 'tasks', 'Delete tasks')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('assign_tasks', 'tasks', 'Assign tasks to employees')`,

  // Follow-ups module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_followups', 'followups', 'View follow-ups')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_followups', 'followups', 'Create follow-ups')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('edit_followups', 'followups', 'Edit follow-ups')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_followups', 'followups', 'Delete follow-ups')`,

  // Notes module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_notes', 'notes', 'View notes')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_notes', 'notes', 'Create notes')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_notes', 'notes', 'Delete notes')`,

  // Requests module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_requests', 'requests', 'View requests')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('create_requests', 'requests', 'Create requests')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('review_requests', 'requests', 'Approve/reject requests')`,

  // Sheets module
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_sheets', 'sheets', 'View Google Sheets')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('import_sheets', 'sheets', 'Import data from sheets')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('download_data', 'sheets', 'Download data')`,

  // Dashboard
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_dashboard', 'dashboard', 'View dashboard')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_leaderboard', 'dashboard', 'View leaderboard')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_reports', 'dashboard', 'View reports')`,

  // Activity logs
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_activity_logs', 'activity', 'View activity logs')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('download_activity_logs', 'activity', 'Download activity logs')`,

  // Notifications
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('view_notifications', 'notifications', 'View notifications')`,

  // Super sub-admin restricted actions
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_client', 'clients', 'Permanently delete clients')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_employee', 'users', 'Permanently delete/deactivate employees')`,
  `INSERT IGNORE INTO permissions (name, module, description) VALUES ('delete_branch', 'branches', 'Permanently delete/deactivate branches')`,
];

// Admin gets ALL permissions
const SEED_ADMIN_PERMISSIONS = `
  INSERT IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
`;

async function migrate() {
  let connection;
  try {
    // Connect without database to create it if needed
    connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
    });

    logger.info('Connected to MySQL server');

    // Create database if not exists
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    logger.info(`Database "${config.db.database}" ensured`);

    await connection.changeUser({ database: config.db.database });

    // Create tables
    for (const sql of TABLES) {
      await connection.execute(sql);
    }
    logger.info(`${TABLES.length} tables created/verified`);

    // Add is_super column to existing users table (safe for re-runs)
    try {
      await connection.execute(`ALTER TABLE users ADD COLUMN is_super TINYINT(1) DEFAULT 0 AFTER is_active`);
      logger.info('Added is_super column to users table');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      // Column already exists, safe to ignore
    }

    // Create performance indexes
    for (const sql of INDEXES) {
      try {
        await connection.execute(sql);
      } catch (e) {
        // Ignore duplicate index errors (MySQL < 8.0.16 doesn't support IF NOT EXISTS for indexes)
        if (e.code !== 'ER_DUP_KEYNAME') throw e;
      }
    }
    logger.info(`${INDEXES.length} indexes created/verified`);

    // Seed roles
    for (const sql of SEED_ROLES) {
      await connection.execute(sql);
    }
    logger.info('Default roles seeded');

    // Seed permissions
    for (const sql of SEED_PERMISSIONS) {
      await connection.execute(sql);
    }
    logger.info('Default permissions seeded');

    // Assign all permissions to admin
    await connection.execute(SEED_ADMIN_PERMISSIONS);
    logger.info('Admin permissions assigned');

    logger.info('Migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrate().then(() => process.exit(0));
}

module.exports = { migrate };
