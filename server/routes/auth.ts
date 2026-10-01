import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { signToken, authMiddleware, type AuthUser } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

// ---------- 登录 ----------
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return fail(res, '用户名和密码不能为空');
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user) {
    return fail(res, '用户名或密码错误', 401, 401);
  }
  if (user.status !== 'active') {
    return fail(res, '账号已被禁用', 403, 403);
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return fail(res, '用户名或密码错误', 401, 401);
  }

  const authUser: AuthUser = { id: user.id, username: user.username, name: user.name, role: user.role };
  const token = signToken(authUser);

  success(res, {
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      department: user.department,
      status: user.status,
    },
  });
});

// ---------- 当前用户 ----------
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, email, phone, department, status, created_at FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    return fail(res, '用户不存在', 404, 404);
  }
  success(res, user);
});

// ---------- 登出 ----------
router.post('/logout', authMiddleware, (_req, res) => {
  success(res, null, '已退出登录');
});

// ---------- 用户列表 ----------
router.get('/users', authMiddleware, (req, res) => {
  const { keyword, role, status } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '20');
  const conditions: string[] = [];
  const params: any[] = [];

  if (keyword) {
    conditions.push('(name LIKE ? OR username LIKE ? OR email LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (role && role !== 'all') {
    conditions.push('role = ?');
    params.push(role);
  }
  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const list = db.prepare(
    `SELECT id, username, name, role, status, email, phone, department, created_at
     FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset);

  success(res, { list, total, page: p, pageSize: ps });
});

// ---------- 新增用户 ----------
router.post('/users', authMiddleware, (req, res) => {
  const { username, name, password, role = 'sales', status = 'active', email = '', phone = '', department = '' } = req.body;
  if (!username || !name || !password) {
    return fail(res, '用户名、姓名、密码不能为空');
  }
  if (password.length < 6) {
    return fail(res, '密码长度不能少于 6 位');
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return fail(res, '用户名已存在');
  }

  const hashed = bcrypt.hashSync(password, 10);
  const id = `user-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO users (id, username, password, name, role, status, email, phone, department)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, username, hashed, name, role, status, email, phone, department);

  const user = db.prepare('SELECT id, username, name, role, status, email, phone, department, created_at FROM users WHERE id = ?').get(id);
  success(res, user, '用户创建成功');
});

// ---------- 编辑用户 ----------
router.put('/users/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, role, status, email, phone, department, password } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) {
    return fail(res, '用户不存在', 404, 404);
  }

  const fields: string[] = [];
  const params: any[] = [];

  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (role !== undefined) { fields.push('role = ?'); params.push(role); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
  if (department !== undefined) { fields.push('department = ?'); params.push(department); }
  if (password) {
    if (password.length < 6) return fail(res, '密码长度不能少于 6 位');
    fields.push('password = ?');
    params.push(bcrypt.hashSync(password, 10));
  }

  if (fields.length === 0) {
    return fail(res, '没有需要更新的字段');
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  const user = db.prepare('SELECT id, username, name, role, status, email, phone, department, created_at FROM users WHERE id = ?').get(id);
  success(res, user, '用户信息已更新');
});

// ---------- 删除用户 ----------
router.delete('/users/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  if (id === req.user?.id) {
    return fail(res, '不能删除当前登录用户');
  }
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) {
    return fail(res, '用户不存在', 404, 404);
  }
  success(res, null, '用户已删除');
});

// ---------- 切换状态 ----------
router.post('/users/:id/toggle-status', authMiddleware, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT status FROM users WHERE id = ?').get(id) as any;
  if (!user) return fail(res, '用户不存在', 404, 404);
  if (id === req.user?.id) return fail(res, '不能禁用当前登录用户');

  const newStatus = user.status === 'active' ? 'disabled' : 'active';
  db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, id);
  success(res, { status: newStatus }, `用户已${newStatus === 'active' ? '启用' : '禁用'}`);
});

export default router;
