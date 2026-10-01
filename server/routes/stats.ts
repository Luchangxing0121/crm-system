import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success } from '../utils/response.js';

const router = Router();

// ---------- 数据看板统计 ----------
router.get('/dashboard', authMiddleware, (_req, res) => {
  const customerCount = (db.prepare('SELECT COUNT(*) as c FROM customers').get() as any).c;
  const opportunityCount = (db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status = 'active'").get() as any).c;
  const projectCount = (db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'active'").get() as any).c;
  const totalOppAmount = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM opportunities WHERE status = 'active'").get() as any).s;
  const totalProjectAmount = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM projects").get() as any).s;
  const totalReceived = (db.prepare("SELECT COALESCE(SUM(received_amount), 0) as s FROM projects").get() as any).s;
  const wonCount = (db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status = 'closed'").get() as any).c;
  const totalOpps = (db.prepare('SELECT COUNT(*) as c FROM opportunities').get() as any).c;
  const winRate = totalOpps > 0 ? Math.round((wonCount / totalOpps) * 100) : 0;

  // 商机阶段分布
  const stages = db.prepare(
    "SELECT stage, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount FROM opportunities WHERE status = 'active' GROUP BY stage ORDER BY stage"
  ).all() as any[];

  // 项目阶段分布
  const projectStages = db.prepare(
    "SELECT stage, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount FROM projects WHERE status = 'active' GROUP BY stage ORDER BY stage"
  ).all() as any[];

  // 客户行业分布
  const industries = db.prepare(
    'SELECT industry, COUNT(*) as count FROM customers WHERE industry IS NOT NULL AND industry != \'\' GROUP BY industry ORDER BY count DESC LIMIT 10'
  ).all() as any[];

  // 待办跟进（有下次跟进时间且未过期的）
  const pendingFollowups = db.prepare(
    `SELECT f.*, u.name as creator_name, cu.name as customer_name
     FROM follow_ups f
     LEFT JOIN users u ON f.creator = u.id
     LEFT JOIN customers cu ON f.customer_id = cu.id
     WHERE f.next_follow_up_date IS NOT NULL AND f.next_follow_up_date != \'\'
     ORDER BY f.next_follow_up_date ASC LIMIT 10`
  ).all() as any[];

  // 最近商机
  const recentOpps = db.prepare(
    `SELECT o.*, cu.name as customer_name FROM opportunities o
     LEFT JOIN customers cu ON o.customer_id = cu.id
     ORDER BY o.created_at DESC LIMIT 5`
  ).all() as any[];

  // 最近项目
  const recentProjects = db.prepare(
    `SELECT p.*, cu.name as customer_name FROM projects p
     LEFT JOIN customers cu ON p.customer_id = cu.id
     ORDER BY p.created_at DESC LIMIT 5`
  ).all() as any[];

  success(res, {
    kpis: {
      customerCount,
      opportunityCount,
      projectCount,
      totalOppAmount,
      totalProjectAmount,
      totalReceived,
      winRate,
    },
    stages,
    projectStages,
    industries,
    pendingFollowups,
    recentOpps,
    recentProjects,
  });
});

// ---------- 统计报表 ----------
router.get('/reports/customers', authMiddleware, (_req, res) => {
  const byIndustry = db.prepare(
    'SELECT industry as name, COUNT(*) as value FROM customers WHERE industry IS NOT NULL AND industry != \'\' GROUP BY industry ORDER BY value DESC'
  ).all();
  const byLevel = db.prepare(
    "SELECT level as name, COUNT(*) as value FROM customers GROUP BY level ORDER BY value DESC"
  ).all();
  const byStatus = db.prepare(
    "SELECT status as name, COUNT(*) as value FROM customers GROUP BY status"
  ).all();
  success(res, { byIndustry, byLevel, byStatus });
});

router.get('/reports/sales', authMiddleware, (_req, res) => {
  // 按月商机金额（按创建月份）
  const monthly = db.prepare(
    `SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as amount
     FROM opportunities WHERE status IN ('active', 'closed')
     GROUP BY month ORDER BY month ASC LIMIT 12`
  ).all();

  // 按负责人商机金额
  const byOwner = db.prepare(
    `SELECT o.owner, u.name, COALESCE(SUM(o.amount), 0) as amount
     FROM opportunities o
     LEFT JOIN users u ON o.owner = u.id
     WHERE o.status IN ('active', 'closed')
     GROUP BY o.owner ORDER BY amount DESC LIMIT 10`
  ).all();

  success(res, { monthly, byOwner });
});

router.get('/reports/funnel', authMiddleware, (_req, res) => {
  const funnel = db.prepare(
    `SELECT stage, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
     FROM opportunities WHERE status = 'active'
     GROUP BY stage ORDER BY stage`
  ).all();

  const total = (db.prepare('SELECT COUNT(*) as c FROM opportunities').get() as any).c;
  const won = (db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status = 'closed'").get() as any).c;
  const lost = (db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status = 'lost'").get() as any).c;

  success(res, { funnel, totals: { total, won, lost } });
});

router.get('/reports/receivables', authMiddleware, (_req, res) => {
  const projects = db.prepare(
    `SELECT p.name, p.amount, p.received_amount, cu.name as customer_name
     FROM projects p LEFT JOIN customers cu ON p.customer_id = cu.id
     ORDER BY p.amount DESC LIMIT 10`
  ).all();

  const totalAmount = (db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM projects').get() as any).s;
  const totalReceived = (db.prepare('SELECT COALESCE(SUM(received_amount), 0) as s FROM projects').get() as any).s;

  success(res, { projects, totalAmount, totalReceived });
});

export default router;
