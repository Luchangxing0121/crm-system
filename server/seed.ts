import db from './db.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { logger } from '@lark-apaas/client-toolkit-lite';

function seedIfEmpty() {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount > 1) return; // 已有用户则跳过

  logger.info('[Seed] 开始导入初始数据...');
  const today = new Date().toISOString().slice(0, 10);

  // ========== 更多用户 ==========
  const users = [
    { id: 'user-2', username: 'zhangsan', name: '张三', role: 'sales', email: 'zhangsan@example.com', phone: '13800000001', department: '销售部' },
    { id: 'user-3', username: 'lisi', name: '李四', role: 'sales', email: 'lisi@example.com', phone: '13800000002', department: '销售部' },
    { id: 'user-4', username: 'wangwu', name: '王五', role: 'manager', email: 'wangwu@example.com', phone: '13800000003', department: '销售部' },
    { id: 'user-5', username: 'zhaoliu', name: '赵六', role: 'sales', email: 'zhaoliu@example.com', phone: '13800000004', department: '销售部' },
  ];
  const hashed = bcrypt.hashSync('123456', 10);
  const insertUser = db.prepare(
    `INSERT INTO users (id, username, password, name, role, status, email, phone, department)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`
  );
  users.forEach((u) => insertUser.run(u.id, u.username, hashed, u.name, u.role, u.email, u.phone, u.department));

  // ========== 客户 ==========
  const customers = [
    { id: 'cust-1', name: '通辽市政务服务数据管理局', industry: '政府', level: 'A', source: '招投标', phone: '0475-8888888', email: 'zwfw@tongliao.gov.cn', address: '内蒙古通辽市科尔沁区', owner: 'user-2', description: '通辽市政务服务数字化转型项目' },
    { id: 'cust-2', name: '大连德泰控股有限公司', industry: '国企', level: 'A', source: '客户介绍', phone: '0411-88888888', email: 'info@detai.cn', address: '辽宁省大连市金州区', owner: 'user-3', description: '大连德泰智慧城市运营平台' },
    { id: 'cust-3', name: '泰安镇人民政府', industry: '政府', level: 'B', source: '招投标', phone: '0514-88888888', email: 'taian@jiangdu.gov.cn', address: '江苏省扬州市江都区泰安镇', owner: 'user-2', description: '泰安镇智慧乡镇建设项目' },
    { id: 'cust-4', name: '高邮市生态环境局', industry: '政府', level: 'A', source: '招投标', phone: '0514-88888888', email: 'hbj@gaoyou.gov.cn', address: '江苏省扬州市高邮市', owner: 'user-4', description: '高邮市生态环境监测平台' },
    { id: 'cust-5', name: '中油易度信息技术有限公司', industry: '能源', level: 'B', source: '自主开拓', phone: '010-88888888', email: 'contact@cnpc-yidu.com', address: '北京市朝阳区', owner: 'user-3', description: '中石油下属信息化公司' },
    { id: 'cust-6', name: '遂川县人民政府', industry: '政府', level: 'A', source: '招投标', phone: '0796-8888888', email: 'xxb@suichuan.gov.cn', address: '江西省吉安市遂川县', owner: 'user-4', description: '遂川县数字政府建设项目' },
    { id: 'cust-7', name: '扬州市邮政管理局', industry: '政府', level: 'B', source: '老客户', phone: '0514-88888888', email: 'yzglj@yzpost.gov.cn', address: '江苏省扬州市邗江区', owner: 'user-2', description: '扬州市邮政业安全监管平台' },
    { id: 'cust-8', name: '浦头镇人民政府', industry: '政府', level: 'C', source: '招投标', phone: '0514-88888888', email: 'putou@jiangdu.gov.cn', address: '江苏省扬州市江都区浦头镇', owner: 'user-5', description: '浦头镇无人机政务巡检项目' },
    { id: 'cust-9', name: '扬州市蜀冈-瘦西湖风景名胜区管委会', industry: '政府', level: 'A', source: '招投标', phone: '0514-88888888', email: 'swhx@yangzhou.gov.cn', address: '江苏省扬州市蜀冈瘦西湖景区', owner: 'user-4', description: '瘦西湖景区智慧管理平台' },
    { id: 'cust-10', name: '高邮市农业农村局', industry: '政府', level: 'B', source: '老客户', phone: '0514-88888888', email: 'nyj@gaoyou.gov.cn', address: '江苏省扬州市高邮市', owner: 'user-3', description: '高邮市智慧农业大数据平台' },
  ];
  const insertCustomer = db.prepare(
    `INSERT INTO customers (id, name, industry, level, status, source, phone, email, address, owner, description)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
  );
  customers.forEach((c) => insertCustomer.run(c.id, c.name, c.industry, c.level, c.source, c.phone, c.email, c.address, c.owner, c.description));

  // ========== 联系人 ==========
  const contacts = [
    { id: 'ct-1', customerId: 'cust-1', name: '王局长', position: '局长', phone: '0475-8888001', mobile: '13900000001', email: 'wang@tongliao.gov.cn', isPrimary: 1, gender: 'male' },
    { id: 'ct-2', customerId: 'cust-1', name: '李科长', position: '信息化科科长', phone: '0475-8888002', mobile: '13900000002', email: 'li@tongliao.gov.cn', isPrimary: 0, gender: 'male' },
    { id: 'ct-3', customerId: 'cust-2', name: '张经理', position: '信息部经理', phone: '0411-8888001', mobile: '13900000003', email: 'zhang@detai.cn', isPrimary: 1, gender: 'male' },
    { id: 'ct-4', customerId: 'cust-2', name: '刘总监', position: '技术总监', phone: '0411-8888002', mobile: '13900000004', email: 'liu@detai.cn', isPrimary: 0, gender: 'female' },
    { id: 'ct-5', customerId: 'cust-4', name: '陈主任', position: '办公室主任', phone: '0514-8888001', mobile: '13900000005', email: 'chen@gaoyou.gov.cn', isPrimary: 1, gender: 'male' },
    { id: 'ct-6', customerId: 'cust-6', name: '赵副县长', position: '副县长', phone: '0796-8888001', mobile: '13900000006', email: 'zhao@suichuan.gov.cn', isPrimary: 1, gender: 'male' },
    { id: 'ct-7', customerId: 'cust-7', name: '孙局长', position: '局长', phone: '0514-8888002', mobile: '13900000007', email: 'sun@yzpost.gov.cn', isPrimary: 1, gender: 'male' },
    { id: 'ct-8', customerId: 'cust-9', name: '周主任', position: '管委会办公室主任', phone: '0514-8888003', mobile: '13900000008', email: 'zhou@yzswhx.gov.cn', isPrimary: 1, gender: 'female' },
    { id: 'ct-9', customerId: 'cust-10', name: '吴局长', position: '局长', phone: '0514-8888004', mobile: '13900000009', email: 'wu@gaoyou.gov.cn', isPrimary: 1, gender: 'male' },
    { id: 'ct-10', customerId: 'cust-3', name: '郑书记', position: '镇党委书记', phone: '0514-8888005', mobile: '13900000010', email: 'zheng@taian.gov.cn', isPrimary: 1, gender: 'male' },
    { id: 'ct-11', customerId: 'cust-5', name: '钱总', position: '技术副总', phone: '010-8888001', mobile: '13900000011', email: 'qian@cnpc-yidu.com', isPrimary: 1, gender: 'male' },
    { id: 'ct-12', customerId: 'cust-8', name: '冯镇长', position: '镇长', phone: '0514-8888006', mobile: '13900000012', email: 'feng@putou.gov.cn', isPrimary: 1, gender: 'male' },
  ];
  const insertContact = db.prepare(
    `INSERT INTO contacts (id, customer_id, name, position, phone, mobile, email, gender, is_primary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  contacts.forEach((c) => insertContact.run(c.id, c.customerId, c.name, c.position, c.phone, c.mobile, c.email, c.gender, c.isPrimary));

  // ========== 商机 ==========
  const opportunities = [
    { id: 'info-4', customerId: 'cust-1', name: '通辽市政务服务一网通办平台', amount: 3200000, stage: 'negotiation', status: 'active', winRate: 75, priority: 'high', source: '招投标', owner: 'user-2', contactPerson: '李科长', contactPhone: '13900000002', budget: 3200000, description: '通辽市政务服务一网通办平台建设项目' },
    { id: 'info-6', customerId: 'cust-2', name: '大连德泰智慧园区管理平台', amount: 2800000, stage: 'proposal', status: 'active', winRate: 60, priority: 'high', source: '客户介绍', owner: 'user-3', contactPerson: '张经理', contactPhone: '13900000003', budget: 2800000, description: '大连德泰控股智慧园区综合管理平台' },
    { id: 'info-7', customerId: 'cust-3', name: '泰安镇智慧乡镇一体化平台', amount: 1500000, stage: 'requirement', status: 'active', winRate: 45, priority: 'medium', source: '招投标', owner: 'user-2', contactPerson: '郑书记', contactPhone: '13900000010', budget: 1500000, description: '泰安镇智慧乡镇综合管理平台项目' },
    { id: 'info-8', customerId: 'cust-4', name: '高邮市生态环境监测与治理平台', amount: 4200000, stage: 'negotiation', status: 'active', winRate: 80, priority: 'high', source: '招投标', owner: 'user-4', contactPerson: '陈主任', contactPhone: '13900000005', budget: 4200000, description: '高邮市生态环境监测预警与治理一体化平台' },
    { id: 'info-12', customerId: 'cust-5', name: '中油易度生产调度指挥系统', amount: 2100000, stage: 'proposal', status: 'active', winRate: 55, priority: 'medium', source: '自主开拓', owner: 'user-3', contactPerson: '钱总', contactPhone: '13900000011', budget: 2100000, description: '中油易度生产调度指挥管理系统升级项目' },
    { id: 'info-13', customerId: 'cust-6', name: '遂川县数字政府一体化政务平台', amount: 5600000, stage: 'contact', status: 'active', winRate: 35, priority: 'high', source: '招投标', owner: 'user-4', contactPerson: '赵副县长', contactPhone: '13900000006', budget: 5600000, description: '遂川县数字政府一体化政务服务平台建设' },
    { id: 'info-14', customerId: 'cust-7', name: '扬州市邮政业安全监管信息平台', amount: 1800000, stage: 'requirement', status: 'active', winRate: 50, priority: 'medium', source: '老客户', owner: 'user-2', contactPerson: '孙局长', contactPhone: '13900000007', budget: 1800000, description: '扬州市邮政业安全监管信息平台二期' },
    { id: 'info-15', customerId: 'cust-8', name: '浦头镇无人机政务巡检服务平台', amount: 850000, stage: 'contact', status: 'paused', winRate: 25, priority: 'low', source: '招投标', owner: 'user-5', contactPerson: '冯镇长', contactPhone: '13900000012', budget: 850000, description: '浦头镇无人机政务巡检综合服务平台', pauseReason: '镇政府换届，项目暂缓' },
    { id: 'info-25', customerId: 'cust-9', name: '蜀冈-瘦西湖景区智慧管理平台', amount: 3900000, stage: 'negotiation', status: 'active', winRate: 70, priority: 'high', source: '招投标', owner: 'user-4', contactPerson: '周主任', contactPhone: '13900000008', budget: 3900000, description: '扬州市蜀冈-瘦西湖风景名胜区智慧管理平台' },
  ];
  const insertOpp = db.prepare(
    `INSERT INTO opportunities (id, customer_id, name, amount, stage, status, win_rate,
     expected_close_date, owner, description, source, priority, contact_person, contact_phone, budget)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const stageLabels: Record<string, string> = {
    lead: '线索阶段', contact: '初步接触', requirement: '需求确认',
    proposal: '方案报价', negotiation: '商务谈判', won: '赢单', lost: '输单',
  };
  const insertStageHistory = db.prepare(
    'INSERT INTO stage_history (opportunity_id, stage, date, remark) VALUES (?, ?, ?, ?)'
  );

  opportunities.forEach((o) => {
    insertOpp.run(o.id, o.customerId, o.name, o.amount, o.stage, o.status, o.winRate,
      o.expectedCloseDate || '', o.owner, o.description, o.source, o.priority,
      o.contactPerson, o.contactPhone, o.budget);

    // 生成阶段历史
    const stageOrder = ['lead', 'contact', 'requirement', 'proposal', 'negotiation'];
    const idx = stageOrder.indexOf(o.stage);
    if (idx >= 0) {
      const baseDate = new Date('2026-08-01');
      for (let i = 0; i <= idx; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i * 7);
        const dateStr = d.toISOString().slice(0, 10);
        const remark = i === 0 ? '商机创建' : `推进至${stageLabels[stageOrder[i]]}`;
        insertStageHistory.run(o.id, stageOrder[i], dateStr, remark);
      }
    }

    if (o.status === 'paused') {
      insertStageHistory.run(o.id, o.stage, '2026-09-01', '项目暂停：镇政府换届，项目暂缓');
    }
  });

  // ========== 项目 ==========
  const projects = [
    { id: 'proj-4', projectNo: 'GY-CL-2026-001', name: '车逻镇智慧乡镇综合管理项目', customerId: 'cust-4', opportunityId: '', amount: 1850000, receivedAmount: 555000, stage: 'execution', status: 'active', priority: 'high', owner: 'user-4', startDate: '2026-03-15', endDate: '2026-12-30', procurementMethod: '公开招标', description: '高邮市车逻镇智慧乡镇综合管理平台建设项目' },
    { id: 'proj-6', projectNo: 'YY-YH-2026-001', name: '云阳县智慧农业大数据平台', customerId: 'cust-6', opportunityId: '', amount: 2600000, receivedAmount: 780000, stage: 'implementation', status: 'active', priority: 'high', owner: 'user-4', startDate: '2026-05-10', endDate: '2027-02-28', procurementMethod: '公开招标', description: '重庆市云阳县智慧农业大数据平台建设' },
    { id: 'proj-10', projectNo: 'GY-NY-2026-002', name: '高邮市农业农村局智慧农业平台', customerId: 'cust-10', opportunityId: '', amount: 3200000, receivedAmount: 960000, stage: 'execution', status: 'active', priority: 'high', owner: 'user-3', startDate: '2026-04-20', endDate: '2027-01-15', procurementMethod: '公开招标', description: '高邮市农业农村局智慧农业综合服务平台' },
  ];
  const insertProject = db.prepare(
    `INSERT INTO projects (id, project_no, name, customer_id, opportunity_id, amount,
     received_amount, stage, status, priority, owner, start_date, end_date, procurement_method, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertProjStageHistory = db.prepare(
    'INSERT INTO stage_history (project_id, stage, date, remark) VALUES (?, ?, ?, ?)'
  );
  const projStageLabels: Record<string, string> = {
    initiated: '项目启动', procurement: '采购挂网', contract: '合同签订',
    execution: '项目执行', acceptance: '验收交付', completed: '已结项',
    implementation: '系统实施',
  };
  projects.forEach((p) => {
    insertProject.run(p.id, p.projectNo, p.name, p.customerId, p.opportunityId, p.amount,
      p.receivedAmount, p.stage, p.status, p.priority, p.owner, p.startDate, p.endDate,
      p.procurementMethod, p.description);

    const projStageOrder = ['initiated', 'procurement', 'contract', 'execution', 'acceptance', 'completed'];
    const implStages = ['initiated', 'procurement', 'contract', 'implementation', 'acceptance', 'completed'];
    const order = p.stage === 'implementation' ? implStages : projStageOrder;
    const idx = order.indexOf(p.stage);
    if (idx >= 0) {
      const baseDate = new Date(p.startDate);
      for (let i = 0; i <= idx; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i * 20);
        const dateStr = d.toISOString().slice(0, 10);
        const remark = i === 0 ? '项目启动' : `推进至${projStageLabels[order[i]] || order[i]}`;
        insertProjStageHistory.run(p.id, order[i], dateStr, remark);
      }
    }
  });

  // ========== 跟进记录 ==========
  const followUps = [
    // 商机相关
    { relType: 'opportunity', relId: 'info-4', customerId: 'cust-1', opportunityId: 'info-4', type: 'call', content: '电话沟通项目需求，确认一网通办平台建设方向', result: '客户认可方案', nextFollowUpDate: '2026-09-10', creator: 'user-2' },
    { relType: 'opportunity', relId: 'info-4', customerId: 'cust-1', opportunityId: 'info-4', type: 'visit', content: '现场拜访王局长和李科长，演示平台原型，收集详细需求', result: '需求已确认', nextFollowUpDate: '', creator: 'user-2' },
    { relType: 'opportunity', relId: 'info-4', customerId: 'cust-1', opportunityId: 'info-4', type: 'meeting', content: '技术方案评审会，我方技术团队做方案汇报', result: '方案通过', nextFollowUpDate: '', creator: 'user-4' },
    { relType: 'opportunity', relId: 'info-4', customerId: 'cust-1', opportunityId: 'info-4', type: 'email', content: '发送技术方案和商务报价文件', result: '已查收', nextFollowUpDate: '', creator: 'user-2' },

    { relType: 'opportunity', relId: 'info-6', customerId: 'cust-2', opportunityId: 'info-6', type: 'visit', content: '到大连德泰拜访张经理，了解园区信息化现状', result: '需求初步明确', nextFollowUpDate: '2026-09-12', creator: 'user-3' },
    { relType: 'opportunity', relId: 'info-6', customerId: 'cust-2', opportunityId: 'info-6', type: 'call', content: '电话沟通刘总监，确认技术架构选型', result: '倾向微服务架构', nextFollowUpDate: '', creator: 'user-3' },
    { relType: 'opportunity', relId: 'info-6', customerId: 'cust-2', opportunityId: 'info-6', type: 'meeting', content: '线上方案讨论会', result: '待客户内部评审', nextFollowUpDate: '2026-09-15', creator: 'user-4' },

    { relType: 'opportunity', relId: 'info-8', customerId: 'cust-4', opportunityId: 'info-8', type: 'visit', content: '现场调研高邮生态环境局业务需求', result: '需求文档已确认', nextFollowUpDate: '', creator: 'user-4' },
    { relType: 'opportunity', relId: 'info-8', customerId: 'cust-4', opportunityId: 'info-8', type: 'meeting', content: '技术方案答辩会', result: '综合评分第一', nextFollowUpDate: '', creator: 'user-4' },
    { relType: 'opportunity', relId: 'info-8', customerId: 'cust-4', opportunityId: 'info-8', type: 'email', content: '发送中标通知书和合同草案', result: '等待签批', nextFollowUpDate: '2026-09-18', creator: 'user-4' },

    { relType: 'opportunity', relId: 'info-7', customerId: 'cust-3', opportunityId: 'info-7', type: 'call', content: '初次电话联系，介绍智慧乡镇方案', result: '有初步兴趣', nextFollowUpDate: '2026-09-05', creator: 'user-2' },
    { relType: 'opportunity', relId: 'info-7', customerId: 'cust-3', opportunityId: 'info-7', type: 'visit', content: '拜访泰安镇政府，现场演示', result: '需求待细化', nextFollowUpDate: '2026-09-14', creator: 'user-2' },

    { relType: 'opportunity', relId: 'info-12', customerId: 'cust-5', opportunityId: 'info-12', type: 'visit', content: '到北京拜访中油易度，了解生产调度现状', result: '有升级意向', nextFollowUpDate: '2026-09-20', creator: 'user-3' },
    { relType: 'opportunity', relId: 'info-12', customerId: 'cust-5', opportunityId: 'info-12', type: 'meeting', content: '线上需求沟通会', result: '需求待整理', nextFollowUpDate: '', creator: 'user-3' },

    { relType: 'opportunity', relId: 'info-13', customerId: 'cust-6', opportunityId: 'info-13', type: 'call', content: '初步电话沟通遂川县数字政府项目情况', result: '待进一步对接', nextFollowUpDate: '2026-09-22', creator: 'user-4' },

    { relType: 'opportunity', relId: 'info-14', customerId: 'cust-7', opportunityId: 'info-14', type: 'visit', content: '拜访扬州邮政管理局，了解一期使用情况和二期需求', result: '二期方向明确', nextFollowUpDate: '2026-09-16', creator: 'user-2' },

    { relType: 'opportunity', relId: 'info-25', customerId: 'cust-9', opportunityId: 'info-25', type: 'visit', content: '瘦西湖景区现场调研', result: '需求已梳理', nextFollowUpDate: '', creator: 'user-4' },
    { relType: 'opportunity', relId: 'info-25', customerId: 'cust-9', opportunityId: 'info-25', type: 'meeting', content: '智慧景区方案汇报会', result: '方案通过，进入商务谈判', nextFollowUpDate: '2026-09-19', creator: 'user-4' },

    // 项目相关
    { relType: 'project', relId: 'proj-4', customerId: 'cust-4', projectId: 'proj-4', type: 'meeting', content: '项目启动会', result: '项目组成立', nextFollowUpDate: '', creator: 'user-4' },
    { relType: 'project', relId: 'proj-4', customerId: 'cust-4', projectId: 'proj-4', type: 'visit', content: '现场需求调研', result: '需求规格说明书已确认', nextFollowUpDate: '', creator: 'user-4' },
    { relType: 'project', relId: 'proj-10', customerId: 'cust-10', projectId: 'proj-10', type: 'meeting', content: '项目周例会', result: '开发进度正常', nextFollowUpDate: '2026-09-17', creator: 'user-3' },
    { relType: 'project', relId: 'proj-6', customerId: 'cust-6', projectId: 'proj-6', type: 'call', content: '电话沟通项目进展', result: '推进顺利', nextFollowUpDate: '', creator: 'user-4' },

    // 客户相关
    { relType: 'customer', relId: 'cust-1', customerId: 'cust-1', type: 'wechat', content: '微信联系李科长，确认投标时间节点', result: '已确认', nextFollowUpDate: '', creator: 'user-2' },
    { relType: 'customer', relId: 'cust-3', customerId: 'cust-3', type: 'call', content: '电话回访，了解近期项目规划', result: '年底有预算', nextFollowUpDate: '2026-09-25', creator: 'user-2' },
  ];
  const insertFollowup = db.prepare(
    `INSERT INTO follow_ups (id, rel_type, rel_id, customer_id, contact_id, opportunity_id,
     project_id, type, content, result, next_follow_up_date, creator, created_at)
     VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  followUps.forEach((f, i) => {
    const id = `fu-${1000 + i}`;
    const date = new Date('2026-08-15');
    date.setDate(date.getDate() + i * 2);
    insertFollowup.run(id, f.relType, f.relId, f.customerId, f.opportunityId || '',
      f.projectId || '', f.type, f.content, f.result, f.nextFollowUpDate, f.creator,
      date.toISOString().slice(0, 10));
  });

  // ========== 商品（批量生成 325 条） ==========
  const productCategories = [
    { cat: '硬件设备', brand: '华为', base: '智能网关' },
    { cat: '硬件设备', brand: '海康威视', base: '高清摄像机' },
    { cat: '硬件设备', brand: '大华', base: '视频解码器' },
    { cat: '软件平台', brand: '自研', base: '综合管理平台' },
    { cat: '软件平台', brand: '自研', base: '数据中台' },
    { cat: '软件平台', brand: '阿里', base: '云计算服务' },
    { cat: '网络设备', brand: '华为', base: '核心交换机' },
    { cat: '网络设备', brand: 'H3C', base: '路由器' },
    { cat: '服务器', brand: '浪潮', base: '机架式服务器' },
    { cat: '服务器', brand: '戴尔', base: '塔式服务器' },
    { cat: '传感器', brand: '海康威视', base: '环境传感器' },
    { cat: '配件耗材', brand: '海康威视', base: '电源适配器' },
  ];
  const taxRates = ['0%', '3%', '6%', '9%', '13%'];
  const units = ['台', '套', '个', '件', '年', '路', '节点', '套/年'];

  const insertProduct = db.prepare(
    `INSERT INTO products (id, name, brand, category, sku, rrp_price, channel_price, tax_rate, unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = 0; i < 325; i++) {
    const catIdx = i % productCategories.length;
    const cat = productCategories[catIdx];
    const idx = Math.floor(i / productCategories.length) + 1;
    const rrp = Math.round((5000 + Math.random() * 95000) / 100) * 100;
    const channel = Math.round(rrp * 0.7 / 100) * 100;
    const id = `prod-${1000 + i}`;
    const name = `${cat.base} ${idx.toString().padStart(3, '0')}`;
    const sku = `${cat.brand.slice(0, 2).toUpperCase()}-${cat.cat.slice(0, 2)}-${idx.toString().padStart(4, '0')}`;
    const taxRate = taxRates[i % taxRates.length];
    const unit = units[i % units.length];
    insertProduct.run(id, name, cat.brand, cat.cat, sku, rrp, channel, taxRate, unit);
  }

  logger.info('[Seed] 初始数据导入完成');
  logger.info(`  - 用户: ${users.length + 1} 人`);
  logger.info(`  - 客户: ${customers.length} 家`);
  logger.info(`  - 联系人: ${contacts.length} 人`);
  logger.info(`  - 商机: ${opportunities.length} 条`);
  logger.info(`  - 项目: ${projects.length} 个`);
  logger.info(`  - 跟进记录: ${followUps.length} 条`);
  logger.info(`  - 商品: 325 条`);
}

export default seedIfEmpty;
