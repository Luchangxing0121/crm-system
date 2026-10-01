import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

function rowToContract(row: any) {
  return {
    id: row.id,
    contractNo: row.contract_no,
    name: row.name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    projectId: row.project_id,
    amount: row.amount,
    signDate: row.sign_date,
    expireDate: row.expire_date,
    status: row.status,
    owner: row.owner,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { keyword, status, customerId } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '20');

  const conditions: string[] = [];
  const params: any[] = [];

  if (keyword) {
    conditions.push('(c.contract_no LIKE ? OR c.name LIKE ? OR cu.name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status && status !== 'all') { conditions.push('c.status = ?'); params.push(status); }
  if (customerId) { conditions.push('c.customer_id = ?'); params.push(customerId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM contracts c ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const rows = db.prepare(
    `SELECT c.*, cu.name as customer_name FROM contracts c
     LEFT JOIN customers cu ON c.customer_id = cu.id
     ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset) as any[];

  success(res, { list: rows.map(rowToContract), total, page: p, pageSize: ps });
});

// ---------- 详情 ----------
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare(
    `SELECT c.*, cu.name as customer_name FROM contracts c
     LEFT JOIN customers cu ON c.customer_id = cu.id
     WHERE c.id = ?`
  ).get(req.params.id) as any;
  if (!row) return fail(res, '合同不存在', 404, 404);
  success(res, rowToContract(row));
});

// ---------- 新增 ----------
router.post('/', authMiddleware, (req, res) => {
  const { contractNo, name, customerId, projectId = '', amount = 0,
    signDate = '', expireDate = '', status = 'pending', owner = '', remark = '' } = req.body;

  if (!contractNo || !name || !customerId) return fail(res, '合同编号、名称、客户不能为空');

  const id = `cont-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO contracts (id, contract_no, name, customer_id, project_id, amount,
     sign_date, expire_date, status, owner, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, contractNo, name, customerId, projectId, amount, signDate, expireDate, status, owner, remark);

  const row = db.prepare(
    `SELECT c.*, cu.name as customer_name FROM contracts c
     LEFT JOIN customers cu ON c.customer_id = cu.id
     WHERE c.id = ?`
  ).get(id) as any;
  success(res, rowToContract(row), '合同创建成功');
});

// ---------- 编辑 ----------
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM contracts WHERE id = ?').get(id);
  if (!existing) return fail(res, '合同不存在', 404, 404);

  const fieldsMap: Record<string, string> = {
    contractNo: 'contract_no', name: 'name', customerId: 'customer_id',
    projectId: 'project_id', amount: 'amount', signDate: 'sign_date',
    expireDate: 'expire_date', status: 'status', owner: 'owner', remark: 'remark',
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
  db.prepare(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare(
    `SELECT c.*, cu.name as customer_name FROM contracts c
     LEFT JOIN customers cu ON c.customer_id = cu.id
     WHERE c.id = ?`
  ).get(id) as any;
  success(res, rowToContract(row), '合同信息已更新');
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return fail(res, '合同不存在', 404, 404);
  success(res, null, '合同已删除');
});

// ---------- 回款计划列表 ----------
router.get('/:id/payments', authMiddleware, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM contract_payments WHERE contract_id = ? ORDER BY period ASC'
  ).all(req.params.id) as any[];
  const list = rows.map((r) => ({
    id: r.id,
    contractId: r.contract_id,
    period: r.period,
    amount: r.amount,
    plannedDate: r.planned_date,
    actualDate: r.actual_date,
    status: r.status,
    remark: r.remark,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  success(res, list);
});

// ---------- 登记回款 ----------
router.post('/:id/payments/:paymentId/register', authMiddleware, (req, res) => {
  const { id, paymentId } = req.params;
  const { actualDate, amount, remark = '' } = req.body;

  const payment = db.prepare('SELECT * FROM contract_payments WHERE id = ? AND contract_id = ?').get(paymentId, id) as any;
  if (!payment) return fail(res, '回款计划不存在', 404, 404);
  if (payment.status === 'paid') return fail(res, '该期已回款，不可重复登记');

  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    "UPDATE contract_payments SET status = 'paid', actual_date = ?, remark = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(actualDate || today, remark, paymentId);

  // 如果有金额参数更新
  if (amount && Number(amount) > 0) {
    db.prepare('UPDATE contract_payments SET amount = ? WHERE id = ?').run(amount, paymentId);
  }

  // 更新合同状态：如果所有期都已回款，标记为completed
  const unpaid = db.prepare(
    "SELECT COUNT(*) as c FROM contract_payments WHERE contract_id = ? AND status != 'paid'"
  ).get(id) as { c: number };
  if (unpaid.c === 0) {
    db.prepare("UPDATE contracts SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(id);
  }

  const updated = db.prepare('SELECT * FROM contract_payments WHERE id = ?').get(paymentId) as any;
  success(res, {
    id: updated.id,
    contractId: updated.contract_id,
    period: updated.period,
    amount: updated.amount,
    plannedDate: updated.planned_date,
    actualDate: updated.actual_date,
    status: updated.status,
    remark: updated.remark,
  }, '回款已登记');
});

export default router;
