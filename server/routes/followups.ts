import { Router } from 'express';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

function rowToFollowup(row: any) {
  return {
    id: row.id,
    relType: row.rel_type,
    relId: row.rel_id,
    customerId: row.customer_id,
    contactId: row.contact_id,
    opportunityId: row.opportunity_id,
    projectId: row.project_id,
    type: row.type,
    content: row.content,
    result: row.result,
    nextFollowUpDate: row.next_follow_up_date,
    creator: row.creator,
    creatorName: row.creator_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { type, creator, relType, relId, customerId, opportunityId, projectId } = req.query as any;
  const page = String(req.query.page || '1');
  const pageSize = String(req.query.pageSize || '50');

  const conditions: string[] = [];
  const params: any[] = [];

  if (type && type !== 'all') { conditions.push('f.type = ?'); params.push(type); }
  if (creator && creator !== 'all') { conditions.push('f.creator = ?'); params.push(creator); }
  if (relType) { conditions.push('f.rel_type = ?'); params.push(relType); }
  if (relId) { conditions.push('f.rel_id = ?'); params.push(relId); }
  if (customerId) { conditions.push('f.customer_id = ?'); params.push(customerId); }
  if (opportunityId) { conditions.push('f.opportunity_id = ?'); params.push(opportunityId); }
  if (projectId) { conditions.push('f.project_id = ?'); params.push(projectId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM follow_ups f ${where}`).get(...params) as any).c;

  const p = Math.max(1, parseInt(page));
  const ps = Math.min(200, Math.max(1, parseInt(pageSize)));
  const offset = (p - 1) * ps;

  const rows = db.prepare(
    `SELECT f.*, u.name as creator_name FROM follow_ups f
     LEFT JOIN users u ON f.creator = u.id
     ${where} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, ps, offset) as any[];

  success(res, { list: rows.map(rowToFollowup), total, page: p, pageSize: ps });
});

// ---------- 新增 ----------
router.post('/', authMiddleware, (req, res) => {
  const { relType, relId, customerId = '', contactId = '', opportunityId = '',
    projectId = '', type = 'call', content = '', result = '', nextFollowUpDate = '' } = req.body;

  if (!relType || !relId) return fail(res, '关联类型和关联ID不能为空');

  const id = `fu-${nanoid(8)}`;
  const creator = req.user?.id || '';

  db.prepare(
    `INSERT INTO follow_ups (id, rel_type, rel_id, customer_id, contact_id, opportunity_id,
     project_id, type, content, result, next_follow_up_date, creator)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, relType, relId, customerId, contactId, opportunityId,
    projectId, type, content, result, nextFollowUpDate, creator);

  const row = db.prepare(
    `SELECT f.*, u.name as creator_name FROM follow_ups f
     LEFT JOIN users u ON f.creator = u.id WHERE f.id = ?`
  ).get(id) as any;
  success(res, rowToFollowup(row), '跟进记录已保存');
});

// ---------- 编辑 ----------
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM follow_ups WHERE id = ?').get(id);
  if (!existing) return fail(res, '跟进记录不存在', 404, 404);

  const fieldsMap: Record<string, string> = {
    type: 'type', content: 'content', result: 'result',
    nextFollowUpDate: 'next_follow_up_date', contactId: 'contact_id',
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
  db.prepare(`UPDATE follow_ups SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare(
    `SELECT f.*, u.name as creator_name FROM follow_ups f
     LEFT JOIN users u ON f.creator = u.id WHERE f.id = ?`
  ).get(id) as any;
  success(res, rowToFollowup(row), '跟进记录已更新');
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM follow_ups WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return fail(res, '跟进记录不存在', 404, 404);
  success(res, null, '跟进记录已删除');
});

export default router;
