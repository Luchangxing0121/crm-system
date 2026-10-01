import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

function rowToOpp(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    name: row.name,
    amount: row.amount,
    stage: row.stage,
    status: row.status,
    winRate: row.win_rate,
    expectedCloseDate: row.expected_close_date,
    owner: row.owner,
    description: row.description,
    source: row.source,
    priority: row.priority,
    contactPerson: row.contact_person,
    contactPhone: row.contact_phone,
    budget: row.budget,
    pauseReason: row.pause_reason,
    lostReason: row.lost_reason,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stageHistory: [] as any[],
  };
}

function loadStageHistory(opportunityId: string) {
  return db.prepare(
    'SELECT stage, date, remark FROM stage_history WHERE opportunity_id = ? ORDER BY id ASC'
  ).all(opportunityId);
}

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { keyword, stage, status, priority, owner } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '50');
  const conditions: string[] = [];
  const params: any[] = [];

  if (keyword) {
    conditions.push('(o.name LIKE ? OR cu.name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (stage && stage !== 'all') { conditions.push('o.stage = ?'); params.push(stage); }
  if (status && status !== 'all') { conditions.push('o.status = ?'); params.push(status); }
  if (priority && priority !== 'all') { conditions.push('o.priority = ?'); params.push(priority); }
  if (owner && owner !== 'all') { conditions.push('o.owner = ?'); params.push(owner); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM opportunities o ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(200, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const rows = db.prepare(
    `SELECT o.*, cu.name as customer_name FROM opportunities o
     LEFT JOIN customers cu ON o.customer_id = cu.id
     ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset) as any[];

  const list = rows.map(rowToOpp);
  success(res, { list, total, page: p, pageSize: ps });
});

// ---------- 详情 ----------
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare(
    `SELECT o.*, cu.name as customer_name FROM opportunities o
     LEFT JOIN customers cu ON o.customer_id = cu.id
     WHERE o.id = ?`
  ).get(req.params.id) as any;
  if (!row) return fail(res, '商机不存在', 404, 404);

  const opp = rowToOpp(row);
  opp.stageHistory = loadStageHistory(req.params.id);
  success(res, opp);
});

// ---------- 新增 ----------
router.post('/', authMiddleware, (req, res) => {
  const { customerId, name, amount = 0, stage = 'lead', status = 'active',
    winRate = 0, expectedCloseDate = '', owner = '', description = '', source = '',
    priority = 'medium', contactPerson = '', contactPhone = '', budget = 0 } = req.body;

  if (!customerId || !name) return fail(res, '客户和商机名称不能为空');

  const id = `opp-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO opportunities (id, customer_id, name, amount, stage, status, win_rate,
     expected_close_date, owner, description, source, priority, contact_person, contact_phone, budget)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, customerId, name, amount, stage, status, winRate, expectedCloseDate, owner,
    description, source, priority, contactPerson, contactPhone, budget);

  // 初始阶段历史
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    'INSERT INTO stage_history (opportunity_id, stage, date, remark) VALUES (?, ?, ?, ?)'
  ).run(id, stage, today, '商机创建');

  const row = db.prepare(
    `SELECT o.*, cu.name as customer_name FROM opportunities o
     LEFT JOIN customers cu ON o.customer_id = cu.id
     WHERE o.id = ?`
  ).get(id) as any;
  const opp = rowToOpp(row);
  opp.stageHistory = loadStageHistory(id);
  success(res, opp, '商机创建成功');
});

// ---------- 编辑 ----------
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM opportunities WHERE id = ?').get(id);
  if (!existing) return fail(res, '商机不存在', 404, 404);

  const fieldsMap: Record<string, string> = {
    customerId: 'customer_id', name: 'name', amount: 'amount', stage: 'stage',
    status: 'status', winRate: 'win_rate', expectedCloseDate: 'expected_close_date',
    owner: 'owner', description: 'description', source: 'source', priority: 'priority',
    contactPerson: 'contact_person', contactPhone: 'contact_phone', budget: 'budget',
    pauseReason: 'pause_reason', lostReason: 'lost_reason', projectId: 'project_id',
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
  db.prepare(`UPDATE opportunities SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare(
    `SELECT o.*, cu.name as customer_name FROM opportunities o
     LEFT JOIN customers cu ON o.customer_id = cu.id
     WHERE o.id = ?`
  ).get(id) as any;
  const opp = rowToOpp(row);
  opp.stageHistory = loadStageHistory(id);
  success(res, opp, '商机信息已更新');
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM opportunities WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return fail(res, '商机不存在', 404, 404);
  db.prepare('DELETE FROM stage_history WHERE opportunity_id = ?').run(req.params.id);
  success(res, null, '商机已删除');
});

// ---------- 阶段推进 ----------
router.post('/:id/advance', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { stage, remark = '' } = req.body;

  const row = db.prepare('SELECT id, stage FROM opportunities WHERE id = ?').get(id) as any;
  if (!row) return fail(res, '商机不存在', 404, 404);

  // 阶段顺序：lead → contact → requirement → proposal → negotiation → won
  const STAGES = ['lead', 'contact', 'requirement', 'proposal', 'negotiation', 'won'];
  const currentIdx = STAGES.indexOf(row.stage);
  const targetStage = stage || (currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null);
  if (!targetStage) return fail(res, '已处于最终阶段，无法继续推进');
  if (!STAGES.includes(targetStage)) return fail(res, '无效的阶段');
  if (STAGES.indexOf(targetStage) <= currentIdx) return fail(res, '目标阶段必须在当前阶段之后');

  const today = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE opportunities SET stage = ?, updated_at = datetime('now') WHERE id = ?").run(targetStage, id);
  db.prepare(
    'INSERT INTO stage_history (opportunity_id, stage, date, remark) VALUES (?, ?, ?, ?)'
  ).run(id, targetStage, today, remark);

  const updatedRow = db.prepare(
    `SELECT o.*, cu.name as customer_name FROM opportunities o
     LEFT JOIN customers cu ON o.customer_id = cu.id
     WHERE o.id = ?`
  ).get(id) as any;
  const updated = rowToOpp(updatedRow);
  updated.stageHistory = loadStageHistory(id);
  success(res, updated, `已推进至${targetStage}`);
});

// ---------- 输单 ----------
router.post('/:id/lose', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { reason = '' } = req.body;
  const opp = db.prepare('SELECT id, stage FROM opportunities WHERE id = ?').get(id) as any;
  if (!opp) return fail(res, '商机不存在', 404, 404);

  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    "UPDATE opportunities SET status = 'lost', lost_reason = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(reason, id);
  db.prepare(
    "INSERT INTO stage_history (opportunity_id, stage, date, remark) VALUES (?, ?, ?, ?)"
  ).run(id, opp.stage, today, `输单：${reason}`);

  success(res, null, '已标记为输单');
});

// ---------- 立项（转项目） ----------
router.post('/:id/initiate', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { projectName, projectNo, owner, startDate, expectedDeliveryDate,
    budget, description = '', procurementMethod = '' } = req.body;

  if (!projectName || !projectNo || !owner) return fail(res, '项目名称、编号、负责人不能为空');

  const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id) as any;
  if (!opp) return fail(res, '商机不存在', 404, 404);
  if (opp.status === 'closed') return fail(res, '商机已关闭，无法重复立项');

  const today = new Date().toISOString().slice(0, 10);
  const projectId = `proj-${nanoid(8)}`;

  const tx = db.transaction(() => {
    // 商机关闭
    db.prepare(
      "UPDATE opportunities SET status = 'closed', project_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(projectId, id);
    db.prepare(
      "INSERT INTO stage_history (opportunity_id, stage, date, remark) VALUES (?, ?, ?, ?)"
    ).run(id, opp.stage, today, `已立项，转入项目池（项目编号：${projectNo}）`);

    // 创建项目
    db.prepare(
      `INSERT INTO projects (id, project_no, name, customer_id, opportunity_id, amount, stage,
        status, priority, owner, start_date, end_date, procurement_method, description, received_amount)
       VALUES (?, ?, ?, ?, ?, ?, 'initiated', 'active', 'medium', ?, ?, ?, ?, ?, 0)`
    ).run(projectId, projectNo, projectName, opp.customer_id, id, budget || opp.amount,
      owner, startDate || today, expectedDeliveryDate, procurementMethod, description);

    db.prepare(
      "INSERT INTO stage_history (project_id, stage, date, remark) VALUES (?, ?, ?, ?)"
    ).run(projectId, 'initiated', today, `从商机「${opp.name}」立项转入`);
  });
  tx();

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  success(res, { projectId, project }, '立项成功，已转入项目池');
});

export default router;
