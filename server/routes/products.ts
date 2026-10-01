import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

function rowToProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    sku: row.sku,
    retailPrice: row.rrp_price,
    channelPrice: row.channel_price,
    taxRate: row.tax_rate,
    unit: row.unit,
    remark: row.remark,
    createdAt: row.created_at,
  };
}

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { keyword, category, brand } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '50');

  const conditions: string[] = [];
  const params: any[] = [];

  if (keyword) {
    conditions.push('(name LIKE ? OR sku LIKE ? OR brand LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (category && category !== 'all') { conditions.push('category = ?'); params.push(category); }
  if (brand && brand !== 'all') { conditions.push('brand = ?'); params.push(brand); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM products ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(200, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const rows = db.prepare(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset) as any[];

  success(res, { list: rows.map(rowToProduct), total, page: p, pageSize: ps });
});

// ---------- 分类列表 ----------
router.get('/categories', authMiddleware, (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category').all() as any[];
  success(res, rows.map((r) => r.category));
});

// ---------- 详情 ----------
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!row) return fail(res, '商品不存在', 404, 404);
  success(res, rowToProduct(row));
});

// ---------- 新增 ----------
router.post('/', authMiddleware, (req, res) => {
  const { name, brand = '', category = '', sku = '', rrpPrice = 0, channelPrice = 0,
    taxRate = '13%', unit = '个', remark = '' } = req.body;

  if (!name) return fail(res, '商品名称不能为空');

  const id = `prod-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO products (id, name, brand, category, sku, rrp_price, channel_price, tax_rate, unit, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, brand, category, sku, rrpPrice, channelPrice, taxRate, unit, remark);

  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  success(res, rowToProduct(row), '商品创建成功');
});

// ---------- 编辑 ----------
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) return fail(res, '商品不存在', 404, 404);

  const fieldsMap: Record<string, string> = {
    name: 'name', brand: 'brand', category: 'category', sku: 'sku',
    rrpPrice: 'rrp_price', channelPrice: 'channel_price',
    taxRate: 'tax_rate', unit: 'unit', remark: 'remark',
  };

  const fields: string[] = [];
  const params: any[] = [];
  Object.entries(fieldsMap).forEach(([key, col]) => {
    if (req.body[key] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(req.body[key]);
    }
  });

  if (fields.length === 0) return fail(res, '没有需要更新的字段');

  fields.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  success(res, rowToProduct(row), '商品信息已更新');
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return fail(res, '商品不存在', 404, 404);
  success(res, null, '商品已删除');
});

export default router;
