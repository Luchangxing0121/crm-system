import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

function rowToContact(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    name: row.name,
    position: row.position,
    phone: row.phone,
    mobile: row.mobile,
    email: row.email,
    qq: row.qq,
    wechat: row.wechat,
    gender: row.gender,
    isPrimary: !!row.is_primary,
    remark: row.remark,
    createdAt: row.created_at,
  };
}

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { keyword, customerId } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '20');
  const conditions: string[] = [];
  const params: any[] = [];

  if (keyword) {
    conditions.push('(c.name LIKE ? OR c.phone LIKE ? OR c.mobile LIKE ? OR c.email LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (customerId) { conditions.push('c.customer_id = ?'); params.push(customerId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM contacts c ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const rows = db.prepare(
    `SELECT c.*, cu.name as customer_name FROM contacts c
     LEFT JOIN customers cu ON c.customer_id = cu.id
     ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset) as any[];

  success(res, { list: rows.map(rowToContact), total, page: p, pageSize: ps });
});

// ---------- 详情 ----------
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare(
    `SELECT c.*, cu.name as customer_name FROM contacts c
     LEFT JOIN customers cu ON c.customer_id = cu.id
     WHERE c.id = ?`
  ).get(req.params.id) as any;
  if (!row) return fail(res, '联系人不存在', 404, 404);
  success(res, rowToContact(row));
});

// ---------- 新增 ----------
router.post('/', authMiddleware, (req, res) => {
  const { customerId, name, position = '', phone = '', mobile = '', email = '',
    qq = '', wechat = '', gender = 'male', isPrimary = false, remark = '' } = req.body;

  if (!customerId || !name) return fail(res, '客户和姓名不能为空');

  const id = `contact-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO contacts (id, customer_id, name, position, phone, mobile, email, qq, wechat, gender, is_primary, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, customerId, name, position, phone, mobile, email, qq, wechat, gender, isPrimary ? 1 : 0, remark);

  const row = db.prepare(
    `SELECT c.*, cu.name as customer_name FROM contacts c
     LEFT JOIN customers cu ON c.customer_id = cu.id
     WHERE c.id = ?`
  ).get(id) as any;
  success(res, rowToContact(row), '联系人创建成功');
});

// ---------- 编辑 ----------
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(id);
  if (!existing) return fail(res, '联系人不存在', 404, 404);

  const fields: string[] = [];
  const params: any[] = [];
  const fieldsMap: Record<string, string> = {
    customerId: 'customer_id', name: 'name', position: 'position',
    phone: 'phone', mobile: 'mobile', email: 'email',
    qq: 'qq', wechat: 'wechat', gender: 'gender', remark: 'remark',
  };

  Object.entries(fieldsMap).forEach(([key, col]) => {
    if (req.body[key] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(req.body[key]);
    }
  });

  if (req.body.isPrimary !== undefined) {
    fields.push('is_primary = ?');
    params.push(req.body.isPrimary ? 1 : 0);
  }

  if (fields.length === 0) return fail(res, '没有需要更新的字段');

  fields.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare(
    `SELECT c.*, cu.name as customer_name FROM contacts c
     LEFT JOIN customers cu ON c.customer_id = cu.id
     WHERE c.id = ?`
  ).get(id) as any;
  success(res, rowToContact(row), '联系人信息已更新');
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return fail(res, '联系人不存在', 404, 404);
  success(res, null, '联系人已删除');
});

export default router;
