import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

function rowToProject(row: any) {
  return {
    id: row.id,
    projectNo: row.project_no,
    name: row.name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    opportunityId: row.opportunity_id,
    amount: row.amount,
    receivedAmount: row.received_amount,
    stage: row.stage,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    startDate: row.start_date,
    endDate: row.end_date,
    procurementMethod: row.procurement_method,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stageHistory: [] as any[],
  };
}

function loadProjectStageHistory(projectId: string) {
  return db.prepare(
    'SELECT stage, date, remark FROM stage_history WHERE project_id = ? ORDER BY id ASC'
  ).all(projectId);
}

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { keyword, stage, status, owner } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '20');

  const conditions: string[] = [];
  const params: any[] = [];

  if (keyword) {
    conditions.push('(p.name LIKE ? OR p.project_no LIKE ? OR cu.name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (stage && stage !== 'all') { conditions.push('p.stage = ?'); params.push(stage); }
  if (status && status !== 'all') { conditions.push('p.status = ?'); params.push(status); }
  if (owner && owner !== 'all') { conditions.push('p.owner = ?'); params.push(owner); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM projects p ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const rows = db.prepare(
    `SELECT p.*, cu.name as customer_name FROM projects p
     LEFT JOIN customers cu ON p.customer_id = cu.id
     ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset) as any[];

  const list = rows.map(rowToProject);
  success(res, { list, total, page: p, pageSize: ps });
});

// ---------- 全部列表 ----------
router.get('/all', authMiddleware, (_req, res) => {
  const rows = db.prepare(
    `SELECT p.id, p.name, p.project_no, p.customer_id, cu.name as customer_name
     FROM projects p LEFT JOIN customers cu ON p.customer_id = cu.id
     ORDER BY p.created_at DESC`
  ).all() as any[];
  success(res, rows);
});

// ---------- 详情 ----------
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare(
    `SELECT p.*, cu.name as customer_name FROM projects p
     LEFT JOIN customers cu ON p.customer_id = cu.id
     WHERE p.id = ?`
  ).get(req.params.id) as any;
  if (!row) return fail(res, '项目不存在', 404, 404);

  const project = rowToProject(row);
  project.stageHistory = loadProjectStageHistory(req.params.id);
  success(res, project);
});

// ---------- 新增 ----------
router.post('/', authMiddleware, (req, res) => {
  const { projectNo = '', name, customerId, opportunityId = '', amount = 0,
    stage = 'initiated', status = 'active', priority = 'medium', owner = '',
    startDate = '', endDate = '', procurementMethod = '', description = '' } = req.body;

  if (!name || !customerId) return fail(res, '项目名称和客户不能为空');

  const id = `proj-${nanoid(8)}`;
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(
    `INSERT INTO projects (id, project_no, name, customer_id, opportunity_id, amount,
     received_amount, stage, status, priority, owner, start_date, end_date, procurement_method, description)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, projectNo, name, customerId, opportunityId, amount, stage, status, priority,
    owner, startDate, endDate, procurementMethod, description);

  db.prepare(
    'INSERT INTO stage_history (project_id, stage, date, remark) VALUES (?, ?, ?, ?)'
  ).run(id, stage, today, '项目创建');

  const row = db.prepare(
    `SELECT p.*, cu.name as customer_name FROM projects p
     LEFT JOIN customers cu ON p.customer_id = cu.id
     WHERE p.id = ?`
  ).get(id) as any;
  const project = rowToProject(row);
  project.stageHistory = loadProjectStageHistory(id);
  success(res, project, '项目创建成功');
});

// ---------- 编辑 ----------
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!existing) return fail(res, '项目不存在', 404, 404);

  const fieldsMap: Record<string, string> = {
    projectNo: 'project_no', name: 'name', customerId: 'customer_id',
    opportunityId: 'opportunity_id', amount: 'amount', stage: 'stage',
    status: 'status', priority: 'priority', owner: 'owner',
    startDate: 'start_date', endDate: 'end_date',
    procurementMethod: 'procurement_method', description: 'description',
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
  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare(
    `SELECT p.*, cu.name as customer_name FROM projects p
     LEFT JOIN customers cu ON p.customer_id = cu.id
     WHERE p.id = ?`
  ).get(id) as any;
  const project = rowToProject(row);
  project.stageHistory = loadProjectStageHistory(id);
  success(res, project, '项目信息已更新');
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return fail(res, '项目不存在', 404, 404);
  db.prepare('DELETE FROM stage_history WHERE project_id = ?').run(req.params.id);
  success(res, null, '项目已删除');
});

// ---------- 阶段推进 ----------
router.post('/:id/advance', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { stage, remark = '' } = req.body;
  if (!stage) return fail(res, '阶段不能为空');

  const proj = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!proj) return fail(res, '项目不存在', 404, 404);

  const today = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE projects SET stage = ?, updated_at = datetime('now') WHERE id = ?").run(stage, id);
  db.prepare(
    'INSERT INTO stage_history (project_id, stage, date, remark) VALUES (?, ?, ?, ?)'
  ).run(id, stage, today, remark);

  const row = db.prepare(
    `SELECT p.*, cu.name as customer_name FROM projects p
     LEFT JOIN customers cu ON p.customer_id = cu.id
     WHERE p.id = ?`
  ).get(id) as any;
  const updated = rowToProject(row);
  updated.stageHistory = loadProjectStageHistory(id);
  success(res, updated, `已推进至${stage}`);
});

// ---------- 登记回款 ----------
router.post('/:id/receive', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!amount || amount <= 0) return fail(res, '回款金额不能为空');

  const proj = db.prepare('SELECT received_amount FROM projects WHERE id = ?').get(id) as any;
  if (!proj) return fail(res, '项目不存在', 404, 404);

  const newReceived = (proj.received_amount || 0) + Number(amount);
  db.prepare(
    "UPDATE projects SET received_amount = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newReceived, id);

  success(res, { receivedAmount: newReceived }, '回款登记成功');
});

export default router;
