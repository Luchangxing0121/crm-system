import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { logger } from '@lark-apaas/client-toolkit-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.CRM_DATA_DIR || path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'crm.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== 建表 ==========

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales',
  status TEXT NOT NULL DEFAULT 'active',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  department TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT DEFAULT '',
  level TEXT DEFAULT 'C',
  status TEXT DEFAULT 'active',
  source TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  website TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  UNIQUE(customer_id, tag)
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  email TEXT DEFAULT '',
  qq TEXT DEFAULT '',
  wechat TEXT DEFAULT '',
  gender TEXT DEFAULT 'male',
  is_primary INTEGER DEFAULT 0,
  remark TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'lead',
  status TEXT NOT NULL DEFAULT 'active',
  win_rate INTEGER DEFAULT 0,
  expected_close_date TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  description TEXT DEFAULT '',
  source TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium',
  contact_person TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  budget REAL DEFAULT 0,
  pause_reason TEXT DEFAULT '',
  lost_reason TEXT DEFAULT '',
  project_id TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stage_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_id TEXT,
  project_id TEXT,
  stage TEXT NOT NULL,
  date TEXT NOT NULL,
  remark TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_no TEXT DEFAULT '',
  name TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  opportunity_id TEXT DEFAULT '',
  quotation_id TEXT DEFAULT '',
  amount REAL DEFAULT 0,
  received_amount REAL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'initiated',
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  owner TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  procurement_method TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  rel_type TEXT NOT NULL,
  rel_id TEXT NOT NULL,
  customer_id TEXT DEFAULT '',
  contact_id TEXT DEFAULT '',
  opportunity_id TEXT DEFAULT '',
  project_id TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'call',
  content TEXT NOT NULL DEFAULT '',
  result TEXT DEFAULT '',
  next_follow_up_date TEXT DEFAULT '',
  creator TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  quotation_no TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  opportunity_id TEXT DEFAULT '',
  project_id TEXT DEFAULT '',
  quotation_date TEXT DEFAULT '',
  valid_until TEXT DEFAULT '',
  total_amount REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  remark TEXT DEFAULT '',
  creator TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  product_id TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  spec TEXT DEFAULT '',
  quantity REAL DEFAULT 1,
  unit_price REAL DEFAULT 0,
  discount REAL DEFAULT 100,
  subtotal REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  category TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  rrp_price REAL DEFAULT 0,
  channel_price REAL DEFAULT 0,
  tax_rate TEXT DEFAULT '13%',
  unit TEXT DEFAULT '个',
  remark TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_no TEXT NOT NULL,
  name TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  project_id TEXT DEFAULT '',
  amount REAL DEFAULT 0,
  sign_date TEXT DEFAULT '',
  expire_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  owner TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contract_payments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  period INTEGER DEFAULT 1,
  amount REAL DEFAULT 0,
  planned_date TEXT DEFAULT '',
  actual_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  remark TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  rel_type TEXT NOT NULL,
  rel_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_type TEXT DEFAULT '',
  file_path TEXT NOT NULL,
  uploader TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// ========== 初始化数据 ==========

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
if (userCount.c === 0) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (id, username, password, name, role, status, email, phone, department)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'user-1', 'admin', hashed, '系统管理员', 'admin', 'active',
    'admin@example.com', '13800000000', '信息部'
  );
  logger.info('[DB] 初始化管理员账号: admin / admin123');
}

logger.info(`[DB] 数据库就绪: ${DB_PATH}`);

export default db;
