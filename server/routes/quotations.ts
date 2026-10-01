import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

function rowToQuotation(row: any) {
  return {
    id: row.id,
    quotationNo: row.quotation_no,
    customerId: row.customer_id,
    customerName: row.customer_name,
    opportunityId: row.opportunity_id,
    projectId: row.project_id,
    quotationDate: row.quotation_date,
    validUntil: row.valid_until,
    totalAmount: row.total_amount,
    status: row.status,
    remark: row.remark,
    creator: row.creator,
    createdAt: row.created_at,
    items: [] as any[],
  };
}

function loadItems(quotationId: string) {
  return db.prepare(
    `SELECT id, product_id as productId, product_name as productName, spec, quantity,
     unit_price as unitPrice, discount, subtotal
     FROM quotation_items WHERE quotation_id = ? ORDER BY id ASC`
  ).all(quotationId);
}

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { keyword, status, customerId } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '20');

  const conditions: string[] = [];
  const params: any[] = [];

  if (keyword) {
    conditions.push('(q.quotation_no LIKE ? OR q.name LIKE ? OR cu.name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status && status !== 'all') { conditions.push('q.status = ?'); params.push(status); }
  if (customerId) { conditions.push('q.customer_id = ?'); params.push(customerId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM quotations q ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const rows = db.prepare(
    `SELECT q.*, cu.name as customer_name FROM quotations q
     LEFT JOIN customers cu ON q.customer_id = cu.id
     ${where} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset) as any[];

  success(res, { list: rows.map(rowToQuotation), total, page: p, pageSize: ps });
});

// ---------- 详情 ----------
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare(
    `SELECT q.*, cu.name as customer_name FROM quotations q
     LEFT JOIN customers cu ON q.customer_id = cu.id
     WHERE q.id = ?`
  ).get(req.params.id) as any;
  if (!row) return fail(res, '报价不存在', 404, 404);

  const quotation = rowToQuotation(row);
  quotation.items = loadItems(req.params.id);
  success(res, quotation);
});

// ---------- 新增 ----------
router.post('/', authMiddleware, (req, res) => {
  const { quotationNo, customerId, opportunityId = '', projectId = '',
    quotationDate = '', validUntil = '', status = 'draft', remark = '', items = [] } = req.body;

  if (!quotationNo || !customerId) return fail(res, '报价编号和客户不能为空');

  const id = `quot-${nanoid(8)}`;
  const creator = req.user?.id || '';
  const today = new Date().toISOString().slice(0, 10);

  // 计算总价
  const totalAmount = Array.isArray(items)
    ? items.reduce((sum: number, it: any) => sum + (it.subtotal || 0), 0)
    : 0;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO quotations (id, quotation_no, customer_id, opportunity_id, project_id,
       quotation_date, valid_until, total_amount, status, remark, creator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, quotationNo, customerId, opportunityId, projectId,
      quotationDate || today, validUntil, totalAmount, status, remark, creator);

    if (Array.isArray(items) && items.length > 0) {
      const insertItem = db.prepare(
        `INSERT INTO quotation_items (id, quotation_id, product_id, product_name, spec,
         quantity, unit_price, discount, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      items.forEach((it: any) => {
        insertItem.run(
          `qi-${nanoid(8)}`, id, it.productId || '', it.productName || '',
          it.spec || '', it.quantity || 1, it.unitPrice || 0, it.discount || 100,
          it.subtotal || 0
        );
      });
    }
  });
  tx();

  const row = db.prepare(
    `SELECT q.*, cu.name as customer_name FROM quotations q
     LEFT JOIN customers cu ON q.customer_id = cu.id
     WHERE q.id = ?`
  ).get(id) as any;
  const quotation = rowToQuotation(row);
  quotation.items = loadItems(id);
  success(res, quotation, '报价创建成功');
});

// ---------- 编辑 ----------
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM quotations WHERE id = ?').get(id);
  if (!existing) return fail(res, '报价不存在', 404, 404);

  const { items, ...rest } = req.body;

  const fieldsMap: Record<string, string> = {
    quotationNo: 'quotation_no', customerId: 'customer_id',
    opportunityId: 'opportunity_id', projectId: 'project_id',
    quotationDate: 'quotation_date', validUntil: 'valid_until',
    totalAmount: 'total_amount', status: 'status', remark: 'remark',
  };

  const fields: string[] = [];
  const params: any[] = [];
  Object.entries(fieldsMap).forEach(([key, col]) => {
    if (rest[key] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(rest[key]);
    }
  });

  // 如果有 items，重算总价
  let newTotal: number | null = null;
  if (Array.isArray(items)) {
    newTotal = items.reduce((sum: number, it: any) => sum + (it.subtotal || 0), 0);
    fields.push('total_amount = ?');
    params.push(newTotal);
  }

  const tx = db.transaction(() => {
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      params.push(id);
      db.prepare(`UPDATE quotations SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }

    if (Array.isArray(items)) {
      db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(id);
      if (items.length > 0) {
        const insertItem = db.prepare(
          `INSERT INTO quotation_items (id, quotation_id, product_id, product_name, spec,
           quantity, unit_price, discount, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        items.forEach((it: any) => {
          insertItem.run(
            `qi-${nanoid(8)}`, id, it.productId || '', it.productName || '',
            it.spec || '', it.quantity || 1, it.unitPrice || 0, it.discount || 100,
            it.subtotal || 0
          );
        });
      }
    }
  });
  tx();

  const row = db.prepare(
    `SELECT q.*, cu.name as customer_name FROM quotations q
     LEFT JOIN customers cu ON q.customer_id = cu.id
     WHERE q.id = ?`
  ).get(id) as any;
  const quotation = rowToQuotation(row);
  quotation.items = loadItems(id);
  success(res, quotation, '报价已更新');
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM quotations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return fail(res, '报价不存在', 404, 404);
  db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(req.params.id);
  success(res, null, '报价已删除');
});

// ---------- 状态变更 ----------
router.post('/:id/status', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return fail(res, '状态不能为空');

  const existing = db.prepare('SELECT id FROM quotations WHERE id = ?').get(id);
  if (!existing) return fail(res, '报价不存在', 404, 404);

  db.prepare("UPDATE quotations SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  success(res, { status }, '报价状态已更新');
});

// ---------- 转项目 ----------
router.post('/:id/convert-to-project', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { projectName, projectNo, owner, startDate, expectedDeliveryDate, description = '' } = req.body;

  const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id) as any;
  if (!quote) return fail(res, '报价不存在', 404, 404);
  if (!quote.customerId) return fail(res, '报价未关联客户，无法转项目');

  if (!projectName || !projectNo || !owner) return fail(res, '项目名称、编号、负责人不能为空');

  const today = new Date().toISOString().slice(0, 10);
  const projectId = `proj-${nanoid(8)}`;

  const tx = db.transaction(() => {
    // 报价标记为已转项目
    db.prepare("UPDATE quotations SET status = 'converted', project_id = ?, updated_at = datetime('now') WHERE id = ?").run(projectId, id);

    // 创建项目
    db.prepare(
      `INSERT INTO projects (id, project_no, name, customer_id, quotation_id, amount, stage,
        status, priority, owner, start_date, end_date, procurement_method, description, received_amount)
       VALUES (?, ?, ?, ?, ?, ?, 'initiated', 'active', 'medium', ?, ?, ?, ?, ?, 0)`
    ).run(projectId, projectNo, projectName, quote.customer_id, id, quote.total || quote.amount,
      owner, startDate || today, expectedDeliveryDate, quote.procurementMethod || '', description);

    db.prepare(
      "INSERT INTO stage_history (project_id, stage, date, remark) VALUES (?, ?, ?, ?)"
    ).run(projectId, 'initiated', today, `从报价「${quote.name || quote.quotation_no}」转入`);
  });
  tx();

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  success(res, { projectId, project }, '已转为项目');
});

export default router;
