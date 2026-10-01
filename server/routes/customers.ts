import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

function rowToCustomer(row: any) {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    level: row.level,
    status: row.status,
    source: row.source,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    owner: row.owner,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: [] as string[],
  };
}

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { keyword, industry, level, status } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '20');
  const conditions: string[] = [];
  const params: any[] = [];

  if (keyword) {
    conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (industry && industry !== 'all') { conditions.push('industry = ?'); params.push(industry); }
  if (level && level !== 'all') { conditions.push('level = ?'); params.push(level); }
  if (status && status !== 'all') { conditions.push('status = ?'); params.push(status); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM customers ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const rows = db.prepare(
    `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset) as any[];

  const list = rows.map(rowToCustomer);

  // 加载 tags
  if (list.length > 0) {
    const ids = list.map((c) => c.id);
    const placeholders = ids.map(() => '?').join(',');
    const tagRows = db.prepare(
      `SELECT customer_id, tag FROM customer_tags WHERE customer_id IN (${placeholders})`
    ).all(...ids) as any[];

    const tagMap = new Map<string, string[]>();
    tagRows.forEach((r) => {
      if (!tagMap.has(r.customer_id)) tagMap.set(r.customer_id, []);
      tagMap.get(r.customer_id)!.push(r.tag);
    });
    list.forEach((c) => { c.tags = tagMap.get(c.id) || []; });
  }

  success(res, { list, total, page: p, pageSize: ps });
});

// ---------- 全部列表（用于下拉选择） ----------
router.get('/all', authMiddleware, (_req, res) => {
  const rows = db.prepare('SELECT id, name, industry, level, status FROM customers ORDER BY name ASC').all() as any[];
  success(res, rows);
});

// ---------- 详情 ----------
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
  if (!row) return fail(res, '客户不存在', 404, 404);

  const customer = rowToCustomer(row);
  const tagRows = db.prepare('SELECT tag FROM customer_tags WHERE customer_id = ?').all(req.params.id) as any[];
  customer.tags = tagRows.map((t) => t.tag);

  success(res, customer);
});

// ---------- 新增 ----------
router.post('/', authMiddleware, (req, res) => {
  const { name, industry = '', level = 'C', status = 'active', source = '',
    phone = '', email = '', address = '', website = '', owner = '', description = '', tags = [] } = req.body;

  if (!name) return fail(res, '客户名称不能为空');

  const id = `cust-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO customers (id, name, industry, level, status, source, phone, email, address, website, owner, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, industry, level, status, source, phone, email, address, website, owner, description);

  if (Array.isArray(tags) && tags.length > 0) {
    const insertTag = db.prepare('INSERT OR IGNORE INTO customer_tags (customer_id, tag) VALUES (?, ?)');
    const tx = db.transaction((items: string[]) => {
      items.forEach((tag) => insertTag.run(id, tag));
    });
    tx(tags);
  }

  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  const customer = rowToCustomer(row);
  customer.tags = tags;
  success(res, customer, '客户创建成功');
});

// ---------- 编辑 ----------
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
  if (!existing) return fail(res, '客户不存在', 404, 404);

  const { name, industry, level, status, source, phone, email, address, website, owner, description, tags } = req.body;

  const fields: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (industry !== undefined) { fields.push('industry = ?'); params.push(industry); }
  if (level !== undefined) { fields.push('level = ?'); params.push(level); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (source !== undefined) { fields.push('source = ?'); params.push(source); }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }
  if (address !== undefined) { fields.push('address = ?'); params.push(address); }
  if (website !== undefined) { fields.push('website = ?'); params.push(website); }
  if (owner !== undefined) { fields.push('owner = ?'); params.push(owner); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  if (Array.isArray(tags)) {
    db.prepare('DELETE FROM customer_tags WHERE customer_id = ?').run(id);
    if (tags.length > 0) {
      const insertTag = db.prepare('INSERT OR IGNORE INTO customer_tags (customer_id, tag) VALUES (?, ?)');
      const tx = db.transaction((items: string[]) => {
        items.forEach((tag) => insertTag.run(id, tag));
      });
      tx(tags);
    }
  }

  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  const customer = rowToCustomer(row);
  const tagRows = db.prepare('SELECT tag FROM customer_tags WHERE customer_id = ?').all(id) as any[];
  customer.tags = tagRows.map((t) => t.tag);

  success(res, customer, '客户信息已更新');
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  if (result.changes === 0) return fail(res, '客户不存在', 404, 404);
  db.prepare('DELETE FROM customer_tags WHERE customer_id = ?').run(id);
  success(res, null, '客户已删除');
});

export default router;
