import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const root = process.cwd();
const dbConfig = JSON.parse(fs.readFileSync(path.join(root, "config", "database.json"), "utf8"));
const questionConfig = JSON.parse(fs.readFileSync(path.join(root, "config", "questions.json"), "utf8"));

const server = await mysql.createConnection({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  multipleStatements: true
});

await server.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await server.end();

const db = await mysql.createConnection({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  multipleStatements: true
});

await db.query(`
CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled',
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  permission_type ENUM('page','button') NOT NULL,
  parent_code VARCHAR(100) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(80) NOT NULL,
  phone VARCHAR(30) NULL,
  student_class VARCHAR(80) NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  status ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_role_status (role_id, status),
  INDEX idx_users_real_name (real_name),
  INDEX idx_users_class (student_class)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  total_questions INT NOT NULL,
  config_snapshot JSON NOT NULL,
  status ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  test_id BIGINT UNSIGNED NOT NULL,
  question_number INT NOT NULL,
  content TEXT NOT NULL,
  yes_score INT NOT NULL DEFAULT 1,
  no_score INT NOT NULL DEFAULT 0,
  status ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_questions_test FOREIGN KEY (test_id) REFERENCES tests(id),
  UNIQUE KEY uk_questions_test_number (test_id, question_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS test_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  test_id BIGINT UNSIGNED NOT NULL,
  status ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
  question_order JSON NOT NULL,
  option_orders JSON NOT NULL,
  current_index INT NOT NULL DEFAULT 0,
  total_score INT NULL,
  result_level_code VARCHAR(64) NULL,
  result_level_name VARCHAR(80) NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_sessions_test FOREIGN KEY (test_id) REFERENCES tests(id),
  INDEX idx_sessions_user_status (user_id, status),
  INDEX idx_sessions_completed_at (completed_at),
  INDEX idx_sessions_result_level (result_level_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  test_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  question_number INT NOT NULL,
  question_content_snapshot TEXT NOT NULL,
  selected_value ENUM('yes','no') NOT NULL,
  selected_label VARCHAR(10) NOT NULL,
  score INT NOT NULL,
  answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_answers_session FOREIGN KEY (session_id) REFERENCES test_sessions(id),
  CONSTRAINT fk_answers_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_answers_test FOREIGN KEY (test_id) REFERENCES tests(id),
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions(id),
  UNIQUE KEY uk_answers_session_question (session_id, question_id),
  UNIQUE KEY uk_answers_session_number (session_id, question_number),
  INDEX idx_answers_user (user_id),
  INDEX idx_answers_answered_at (answered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

const roles = [
  ["super_admin", "超级管理员", "拥有系统全部页面和全部功能权限", 1],
  ["admin", "管理员", "管理用户、记录和部分系统配置", 1],
  ["teacher", "教师", "查看所属学生答题记录", 1],
  ["student", "学生", "参与答题并查看个人完成状态", 1]
];

for (const [code, name, description, isSystem] of roles) {
  await db.execute(
    `INSERT INTO roles (code, name, description, is_system)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_system = VALUES(is_system)`,
    [code, name, description, isSystem]
  );
}

const permissions = [
  ["page.records", "答题记录", "page", null, 10],
  ["records.query", "查询", "button", "page.records", 11],
  ["records.reset", "重置", "button", "page.records", 12],
  ["records.detail", "查看详情", "button", "page.records", 13],
  ["records.export", "导出", "button", "page.records", 14],
  ["records.delete", "删除", "button", "page.records", 15],
  ["page.users", "用户列表", "page", null, 20],
  ["users.query", "查询", "button", "page.users", 21],
  ["users.create", "新增", "button", "page.users", 22],
  ["users.edit", "编辑", "button", "page.users", 23],
  ["users.disable", "禁用", "button", "page.users", 24],
  ["users.enable", "启用", "button", "page.users", 25],
  ["users.reset_password", "重置密码", "button", "page.users", 26],
  ["page.roles", "角色管理", "page", null, 30],
  ["roles.query", "查询", "button", "page.roles", 31],
  ["roles.create", "新增", "button", "page.roles", 32],
  ["roles.edit", "编辑", "button", "page.roles", 33],
  ["roles.permissions", "权限配置", "button", "page.roles", 34],
  ["page.welcome", "欢迎页面", "page", null, 40],
  ["page.test", "答题页面", "page", null, 41],
  ["page.result", "答题结束页面", "page", null, 42]
];

for (const item of permissions) {
  await db.execute(
    `INSERT INTO permissions (code, name, permission_type, parent_code, sort_order)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), permission_type = VALUES(permission_type), parent_code = VALUES(parent_code), sort_order = VALUES(sort_order)`,
    item
  );
}

await db.query(`
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'super_admin';
`);
await db.query(`
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('page.records','records.query','records.reset','records.detail','records.export','page.users','users.query','users.create','users.edit','users.disable','users.enable','users.reset_password') WHERE r.code = 'admin';
`);
await db.query(`
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('page.records','records.query','records.reset','records.detail') WHERE r.code = 'teacher';
`);
await db.query(`
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('page.welcome','page.test','page.result') WHERE r.code = 'student';
`);

const [[superRole]] = await db.query("SELECT id FROM roles WHERE code = 'super_admin' LIMIT 1");
const [[studentRole]] = await db.query("SELECT id FROM roles WHERE code = 'student' LIMIT 1");
const adminHash = await bcrypt.hash("admin123", 10);
const studentHash = await bcrypt.hash("jiatong123", 10);

await db.execute(
  `INSERT INTO users (username, password_hash, real_name, role_id, status)
   VALUES (?, ?, ?, ?, 'enabled')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), real_name = VALUES(real_name), role_id = VALUES(role_id), status = 'enabled'`,
  ["admin", adminHash, "超级管理员", superRole.id]
);
await db.execute(
  `INSERT INTO users (username, password_hash, real_name, student_class, role_id, status)
   VALUES (?, ?, ?, ?, ?, 'enabled')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), real_name = VALUES(real_name), student_class = VALUES(student_class), role_id = VALUES(role_id), status = 'enabled'`,
  ["jiatong", studentHash, "jiatong", "默认班级", studentRole.id]
);

await db.execute(
  `INSERT INTO tests (code, name, description, total_questions, config_snapshot, status)
   VALUES (?, ?, ?, ?, CAST(? AS JSON), 'enabled')
   ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), total_questions = VALUES(total_questions), config_snapshot = VALUES(config_snapshot), status = 'enabled'`,
  [questionConfig.testCode, questionConfig.testName, questionConfig.description, questionConfig.totalQuestions, JSON.stringify(questionConfig.scoreRule)]
);
const [[test]] = await db.query("SELECT id FROM tests WHERE code = ? LIMIT 1", [questionConfig.testCode]);

for (const question of questionConfig.questions) {
  await db.execute(
    `INSERT INTO questions (test_id, question_number, content, yes_score, no_score, status)
     VALUES (?, ?, ?, ?, ?, 'enabled')
     ON DUPLICATE KEY UPDATE content = VALUES(content), yes_score = VALUES(yes_score), no_score = VALUES(no_score), status = 'enabled'`,
    [test.id, question.number, question.text, questionConfig.scoreRule.yes, questionConfig.scoreRule.no]
  );
}

await db.end();
console.log(`Database initialized: ${dbConfig.database}`);
console.log("Seed users: admin/admin123, jiatong/jiatong123");
console.log(`Questions imported: ${questionConfig.questions.length}`);
