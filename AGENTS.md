# CRM客户关系管理系统 - 需求拆解文档

## 产品概述

- **产品类型**: 企业级CRM客户关系管理系统
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 销售团队、客户经理、销售管理者
- **核心价值**: 一站式管理客户全生命周期，从线索获取到合同回款，提升销售效率与客户满意度
- **界面语言**: 中文
- **主题偏好**: 浅色（专业企业级管理后台风格）
- **导航模式**: 路径导航
- **导航布局**: Sidebar（左侧导航菜单）+ Topbar（顶部用户信息栏）

---

## 页面结构总览

> **说明**：CRM系统为复杂中后台应用，包含8大核心模块。一级页面出现在侧边导航，二级页面（详情页、编辑页）通过列表页进入。

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 数据看板 | `DashboardPage.tsx` | `/` | 一级 | 导航 |
| 客户管理 | `CustomerListPage.tsx` | `/customers` | 一级 | 导航 |
| 客户详情 | `CustomerDetailPage.tsx` | `/customers/:id` | 二级 | 客户管理页 → 列表项点击 |
| 客户新增/编辑 | `CustomerFormPage.tsx` | `/customers/new`、`/customers/:id/edit` | 二级 | 客户管理页 → 新增/编辑按钮 |
| 联系人管理 | `ContactListPage.tsx` | `/contacts` | 一级 | 导航 |
| 联系人详情 | `ContactDetailPage.tsx` | `/contacts/:id` | 二级 | 联系人管理页 → 列表项点击 |
| 商机管理 | `OpportunityListPage.tsx` | `/opportunities` | 一级 | 导航 |
| 商机详情 | `OpportunityDetailPage.tsx` | `/opportunities/:id` | 二级 | 商机管理页 → 列表项点击 |
| 跟进记录 | `FollowUpPage.tsx` | `/followups` | 一级 | 导航 |
| 合同订单 | `ContractListPage.tsx` | `/contracts` | 一级 | 导航 |
| 合同详情 | `ContractDetailPage.tsx` | `/contracts/:id` | 二级 | 合同订单页 → 列表项点击 |
| 统计报表 | `ReportPage.tsx` | `/reports` | 一级 | 导航 |
| 系统管理 | `SystemPage.tsx` | `/system` | 一级 | 导航 |

---

## 页面布局建议

### 整体布局（Layout）
- **布局模式**: 经典中后台布局 —— 左侧 Sidebar（固定宽度 240px）+ 右侧主内容区
- **顶部**: Topbar 用户信息栏（面包屑 + 搜索 + 通知 + 用户头像下拉）
- **视觉重心**: 主内容区为核心操作区

### 列表类页面（客户/联系人/商机/合同）
- **布局模式**: 上下分区 —— 顶部工具栏 + 中部表格 + 底部分页
- **视觉重心**: 数据表格
- **工具栏**: 搜索框 + 筛选条件 + 新增按钮
- **表格**: 支持行操作（查看/编辑/删除）、列排序

### 详情类页面（客户/联系人/商机/合同）
- **布局模式**: 上下分区 —— 顶部标题栏（基本信息摘要）+ 下部 Tab 切换详情
- **Tab 内容**: 基本信息 / 关联数据（联系人/跟进/商机/合同等）

### 仪表盘/报表页
- **布局模式**: 响应式栅格布局 —— KPI 卡片行 + 图表网格
- **视觉重心**: 图表可视化区域
- **图表类型**: 折线图、柱状图、环形图、漏斗图

---

## 导航配置

- **导航布局**: Sidebar（左侧固定）+ Topbar（顶部用户信息栏）
- **侧边导航项**（共8个一级入口）:

| 导航文字 | 路由 | 图标 |
|---------|------|------|
| 数据看板 | `/` | Dashboard |
| 客户管理 | `/customers` | Users |
| 联系人管理 | `/contacts` | User |
| 商机管理 | `/opportunities` | Target |
| 跟进记录 | `/followups` | Calendar |
| 合同订单 | `/contracts` | FileText |
| 统计报表 | `/reports` | BarChart |
| 系统管理 | `/system` | Settings |

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 客户数据 | demo-mock | `src/data/customers.ts` 中定义丰富的模拟客户数据（含行业、分级、联系人、跟进记录关联） | ✅ 本身就是 mock，提供 20+ 条真实感数据 |
| 联系人数据 | demo-mock | `src/data/contacts.ts` 模拟数据，含职务、联系方式、所属客户关联 | ✅ 本身就是 mock，30+ 条数据 |
| 商机数据 | demo-mock | `src/data/opportunities.ts` 模拟数据，含阶段、金额、赢单率、预计成交时间 | ✅ 本身就是 mock，15+ 条数据 |
| 跟进记录数据 | demo-mock | `src/data/followups.ts` 模拟数据，含类型（拜访/电话/邮件/会议）、时间、内容 | ✅ 本身就是 mock，40+ 条数据 |
| 合同订单数据 | demo-mock | `src/data/contracts.ts` 模拟数据，含金额、签约时间、回款计划、状态 | ✅ 本身就是 mock，10+ 条数据 |
| 统计报表数据 | demo-mock | `src/data/reports.ts` 基于以上 mock 数据聚合计算 | ✅ 本身就是 mock |
| 系统用户数据 | demo-mock | `src/data/users.ts` 模拟用户列表和角色权限 | ✅ 本身就是 mock，8+ 条数据 |
| 看板KPI数据 | demo-mock | 基于各模块 mock 数据聚合计算得出 | ✅ 本身就是 mock |

> 本项目用户明确要求"使用模拟数据展示所有功能"，因此全部数据均为 demo-mock 类型，无需对接真实 API 或插件。

---

## 功能列表

### 页面: 数据看板（DashboardPage）
- **页面目标**: 提供销售全局概览，快速掌握关键指标和待办事项
- **功能点**:
  - **KPI统计卡片展示**: 客户总数、商机总金额、本月业绩、转化率 4 个核心指标卡片，含环比增长标识
  - **客户行业分布图表**: 环形图展示各行业客户数量占比
  - **销售漏斗图**: 按阶段展示商机数量和金额的漏斗转化
  - **业绩趋势折线图**: 近6个月销售业绩趋势对比
  - **待办跟进提醒列表**: 展示近期需跟进的客户和商机，点击跳转详情

### 页面: 客户管理（CustomerListPage）
- **页面目标**: 管理全量客户信息，支持快速检索和维护
- **功能点**:
  - **客户列表展示**: 表格展示客户名称、行业、分级、负责人、创建时间、状态等字段
  - **搜索与筛选**: 支持关键词搜索（客户名称）、按行业筛选、按A/B/C分级筛选、按状态筛选
  - **分页功能**: 支持页码切换和每页条数设置
  - **新增客户**（CRUD-创建）:
    - 触发: 页面右上角"新增客户"按钮
    - 交互: 跳转至客户表单页（或弹出 Dialog），含客户基本信息表单
    - 提交: 将新客户数据加入客户列表
    - 反馈: toast.success('客户创建成功') + 跳转至客户详情页
    - 数据契约: ICustomer 含 name, industry, level, phone, email, address, website, source 等字段
  - **编辑客户**（CRUD-更新）:
    - 触发: 表格行"操作"列 → "编辑"按钮
    - 交互: 跳转至客户表单页，预填充当前客户数据
    - 提交: 更新对应客户记录
    - 反馈: toast.success('客户信息已更新') + 返回列表
  - **删除客户**（CRUD-删除）:
    - 触发: 表格行"操作"列 → "删除"按钮
    - 交互: 弹出确认 Dialog
    - 提交: 从列表移除该客户
    - 反馈: toast.success('客户已删除')

### 页面: 客户详情（CustomerDetailPage）
- **页面目标**: 展示单个客户的完整信息和关联数据
- **功能点**:
  - **客户基本信息卡**: 顶部展示客户名称、分级标签、行业、负责人、联系方式等核心信息
  - **Tab 切换详情**:
    - 基本信息 Tab: 完整的客户档案信息
    - 联系人 Tab: 该客户下的联系人列表
    - 跟进记录 Tab: 时间线展示该客户的所有跟进历史
    - 商机 Tab: 该客户相关的商机列表
    - 合同 Tab: 该客户的合同列表
  - **快捷操作**: 页面顶部"新增跟进"、"新增商机"快捷按钮

### 页面: 联系人管理（ContactListPage）
- **页面目标**: 管理所有联系人信息
- **功能点**:
  - **联系人列表**: 表格展示姓名、职务、所属客户、手机、邮箱等
  - **搜索与筛选**: 按姓名搜索、按所属客户筛选
  - **分页功能**: 支持页码切换
  - **新增/编辑联系人**（CRUD操作）:
    - 触发: "新增联系人"按钮 / 行操作"编辑"
    - 交互: 弹出 Dialog 表单，含姓名、职务、手机、邮箱、QQ、微信、所属客户等字段
    - 提交: 新增或更新联系人记录
    - 反馈: toast 提示成功 + 表格更新

### 页面: 联系人详情（ContactDetailPage）
- **页面目标**: 查看单个联系人的详细信息和关联关系
- **功能点**:
  - **联系人基本信息**: 头像、姓名、职务、联系方式全集
  - **关联客户展示**: 显示所属客户名称，点击跳转至客户详情
  - **跟进记录**: 与该联系人相关的跟进历史

### 页面: 商机管理（OpportunityListPage）
- **页面目标**: 管理销售机会，跟踪商机阶段推进
- **功能点**:
  - **双视图切换**: 支持看板视图（漏斗拖拽）和列表视图切换
  - **销售漏斗看板视图**:
    - 按阶段分列展示（初步接触 → 需求确认 → 方案报价 → 商务谈判 → 赢单/输单）
    - 每列展示该阶段商机卡片（客户名+金额+赢单率）
    - 支持拖拽改变商机阶段
  - **商机列表视图**: 表格展示商机名称、客户、阶段、金额、预计成交时间、赢单率、负责人
  - **新增商机**（CRUD-创建）:
    - 触发: "新增商机"按钮
    - 交互: Dialog 表单，含商机名称、关联客户、金额、预计成交时间、阶段、赢单率
    - 提交: 新增商机记录
    - 反馈: toast.success('商创建成功')
  - **阶段推进**（变更状态）:
    - 触发: 看板拖拽 / 详情页"推进阶段"按钮
    - 交互: 弹出阶段选择 + 推进备注
    - 提交: 更新商机阶段，记录推进历史
    - 反馈: toast.success('已推进至<新阶段>')

### 页面: 商机详情（OpportunityDetailPage）
- **页面目标**: 查看商机全貌，推进销售进程
- **功能点**:
  - **商机基本信息**: 名称、关联客户、金额、阶段、赢单率、预计成交时间、负责人
  - **阶段推进历史**: 时间线展示每个阶段的推进记录
  - **跟进记录 Tab**: 该商机相关的跟进历史
  - **赢单/输单操作**（变更状态）:
    - 触发: 页面顶部"标记赢单"/"标记输单"按钮
    - 交互: Dialog 表单，赢单填签约金额/时间，输单选原因+备注
    - 提交: 更新商机状态为 won/lost
    - 反馈: toast + 状态标签更新

### 页面: 跟进记录（FollowUpPage）
- **页面目标**: 统一查看和管理所有跟进活动
- **功能点**:
  - **时间线展示**: 按时间倒序展示所有跟进记录，含类型图标（拜访/电话/邮件/会议）
  - **筛选功能**: 按跟进类型筛选、按负责人筛选、按时间范围筛选
  - **新增跟进**（CRUD-创建）:
    - 触发: "新增跟进"按钮
    - 交互: Dialog 表单，选择关联客户/商机、跟进类型（拜访/电话/邮件/会议）、跟进内容、下次跟进日期
    - 提交: 新增跟进记录
    - 反馈: toast.success('跟进记录已保存')
  - **下次跟进提醒**: 列表中标识有下次跟进计划的记录，看板页同步展示

### 页面: 合同订单（ContractListPage）
- **页面目标**: 管理合同和回款信息
- **功能点**:
  - **合同列表**: 表格展示合同编号、客户名称、金额、签约时间、状态（待生效/执行中/已完成/已作废）、回款进度
  - **搜索与筛选**: 按合同编号/客户名搜索、按状态筛选
  - **分页功能**
  - **新增合同**（CRUD-创建）:
    - 触发: "新增合同"按钮
    - 交互: Dialog 表单，含合同编号、关联客户、关联商机、金额、签约时间、回款计划
    - 提交: 新增合同记录
    - 反馈: toast.success('合同创建成功')

### 页面: 合同详情（ContractDetailPage）
- **页面目标**: 查看合同详情和回款计划执行情况
- **功能点**:
  - **合同基本信息**: 编号、客户、金额、签约时间、生效日期、状态
  - **回款计划表格**: 列出每笔回款的期数、金额、计划回款日期、实际回款日期、状态
  - **回款记录操作**（变更状态）:
    - 触发: 回款计划行"标记回款"按钮
    - 交互: Dialog 填写实际回款金额和日期
    - 提交: 更新回款状态为已回款
    - 反馈: toast.success('回款记录已更新')

### 页面: 统计报表（ReportPage）
- **页面目标**: 多维度数据分析，辅助决策
- **功能点**:
  - **Tab 切换报表类型**: 客户分析 / 销售业绩 / 商机转化
  - **客户分析报表**:
    - 按行业分布柱状图
    - 按地区分布地图/条形图
    - 按分级（A/B/C）饼图
  - **销售业绩报表**:
    - 按销售人员业绩排名（横向条形图）
    - 按月度业绩趋势（折线图）
  - **商机转化漏斗分析**:
    - 各阶段转化率漏斗图
    - 平均赢单周期统计

### 页面: 系统管理（SystemPage）
- **页面目标**: 管理系统用户和权限配置
- **功能点**:
  - **Tab 切换**: 用户列表 / 角色权限 / 个人设置
  - **用户列表**: 表格展示用户名、姓名、角色、状态、创建时间；支持新增/编辑/禁用用户
  - **角色权限管理**: 角色列表（管理员/销售经理/销售代表），配置各角色的菜单权限和数据权限
  - **个人设置**: 当前用户的基本信息修改、密码修改、通知偏好设置

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_crm_customers` | 客户列表数据，类型 `ICustomer[]` | 客户列表、客户详情、联系人列表、商机列表、合同列表、报表 |
| `__global_crm_contacts` | 联系人列表数据，类型 `IContact[]` | 联系人列表、联系人详情、客户详情 |
| `__global_crm_opportunities` | 商机列表数据，类型 `IOpportunity[]` | 商机列表、商机详情、客户详情、报表、看板 |
| `__global_crm_followups` | 跟进记录数据，类型 `IFollowUp[]` | 跟进记录页、客户详情、商机详情、联系人详情、看板 |
| `__global_crm_contracts` | 合同列表数据，类型 `IContract[]` | 合同列表、合同详情、客户详情、报表 |
| `__global_crm_users` | 系统用户数据，类型 `ISystemUser[]` | 系统管理、各页面负责人字段 |
| `__global_crm_currentUser` | 当前登录用户，类型 `ISystemUser` | 顶部用户栏、个人设置 |

```ts
// 客户
interface ICustomer {
  id: string;
  name: string;
  industry: string;       // 行业：互联网/金融/制造/教育/医疗/零售/其他
  level: 'A' | 'B' | 'C'; // 客户分级
  status: 'active' | 'inactive' | 'potential'; // 客户状态
  source: string;         // 客户来源
  phone: string;
  email: string;
  address: string;
  website: string;
  owner: string;          // 负责人（userId）
  description: string;
  createdAt: string;
  tags: string[];         // 客户标签
}

// 联系人
interface IContact {
  id: string;
  customerId: string;     // 所属客户ID
  name: string;
  position: string;       // 职务
  phone: string;
  mobile: string;
  email: string;
  qq?: string;
  wechat?: string;
  gender: 'male' | 'female';
  isPrimary: boolean;     // 是否主要联系人
  remark: string;
  createdAt: string;
}

// 商机
interface IOpportunity {
  id: string;
  customerId: string;
  name: string;           // 商机名称
  amount: number;         // 商机金额
  stage: 'lead' | 'contact' | 'requirement' | 'proposal' | 'negotiation' | 'won' | 'lost';
  winRate: number;        // 赢单率 0-100
  expectedCloseDate: string; // 预计成交时间
  owner: string;          // 负责人
  description: string;
  source: string;
  createdAt: string;
  stageHistory: { stage: string; date: string; remark: string }[];
}

// 跟进记录
interface IFollowUp {
  id: string;
  customerId: string;
  contactId?: string;
  opportunityId?: string;
  type: 'visit' | 'call' | 'email' | 'meeting'; // 跟进类型
  content: string;        // 跟进内容
  result: string;         // 跟进结果
  nextFollowUpDate?: string; // 下次跟进时间
  creator: string;        // 创建人
  createdAt: string;
}

// 合同
interface IContract {
  id: string;
  contractNo: string;     // 合同编号
  customerId: string;
  opportunityId?: string;
  amount: number;         // 合同金额
  signDate: string;       // 签约日期
  effectiveDate: string;  // 生效日期
  status: 'pending' | 'active' | 'completed' | 'void'; // 状态
  paymentPlan: {
    id: string;
    period: number;       // 期数
    amount: number;
    plannedDate: string;
    actualDate?: string;
    status: 'pending' | 'paid' | 'overdue';
  }[];
  owner: string;
  remark: string;
  createdAt: string;
}

// 系统用户
interface ISystemUser {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'sales';
  status: 'active' | 'disabled';
  email: string;
  phone: string;
  department: string;
  createdAt: string;
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free —— 无参考材料，按 CRM 业务语义与企业级后台使用场景自主设计
- **核心情绪 / 应用类型**: 专业可信、数据清晰、操作高效的销售与客户关系管理后台
- **独特记忆点**: 以「冷靛蓝主色 + 灰度层级分隔」塑造沉稳商务气质，用左侧导航渐隐分割线与统计卡片微浮起强化信息层级

## 2. Art Direction

- **方向名**: 企业冷静秩序
- **Design Style**: Swiss Minimalist + Flat Design —— 以网格与克制用色保证高密度数据可读，扁平清晰降低长时间操作疲劳
- **DNA 参数**: 圆角 subtle (rounded-md) / 阴影 subtle (shadow-sm) / 间距 standard (gap-4 / p-6) / 字体方向 现代无衬线、中性清晰 / 装饰手法 细线分隔、低调 hover、状态用色克制
- **应用类型**: Tool / Workflow —— 左导航 + 顶栏 + 主内容区，表格与表单为核心载体

## 3. Color System

**色彩关系**: 冷靛蓝主色 + 同色相极浅蓝反馈底 + 冷灰白工作台背景 + 深墨灰正文，整体偏冷调、低饱和，强调专业与可信
**配色设计理由**: primary 承担主按钮、当前导航、关键状态与品牌识别；accent 承载 hover/selected 浅底与骨架屏；中性色承担 90% 信息展示，确保长时间阅读不疲劳；语义色保持与主色相近饱和度，避免刺眼
**主色推导**: 从 B2B 销售管理的「信任、专业、沉稳」语义出发，选择偏靛的冷蓝，比默认 SaaS 蓝更深沉，区别于通用后台；通过降低饱和度提升在表格与图表中的耐用性
**使用比例**: 65% 中性 / 25% 辅助 / 10% primary；primary 仅用于主 CTA、当前页高亮、关键数据锚点，不同时用于 tab、icon、边框、链接

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(210 20% 98%) | 页面工作台背景，偏冷灰白 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 卡片、表单、弹层、图表容器 |
| text | `--foreground` | `text-foreground` | hsl(215 28% 17%) | 标题与正文，深墨灰 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(215 14% 45%) | 辅助文字、说明、元信息 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(218 78% 38%) | 主交互、CTA、当前导航、关键状态 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | primary 上的文字与图标 |
| accent | `--accent` | `bg-accent` | hsl(217 33% 95%) | hover/focus 浅底、选中底、菜单项状态 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(218 78% 38%) | accent 上的文字与图标 |
| border | `--border` | `border-border` | hsl(214 15% 88%) | 输入框、卡片、表格、菜单边界 |

**语义色提示**:
- 成功（赢单 / 回款完成 / 有效客户）: bg `hsl(142 55% 94%)` / border `hsl(142 45% 78%)` / text `hsl(142 60% 28%)`；低饱和绿，与 primary 冷调对齐
- 警告（待跟进 / 即将到期 / 推进中）: bg `hsl(38 90% 94%)` / border `hsl(38 75% 78%)` / text `hsl(32 85% 32%)`；暖琥珀，饱和度低于主色 10%
- 错误（输单 / 逾期 / 风险）: bg `hsl(0 75% 95%)` / border `hsl(0 65% 80%)` / text `hsl(0 70% 38%)`；深红，仅用于关键风险，避免大面积
- 客户分级 A/B/C: A 用主色靛蓝 `hsl(218 78% 38%)`，B 用钢蓝 `hsl(210 50% 50%)`，C 用灰蓝 `hsl(215 15% 55%)`；保持同色温，通过明度区分层级
- 图表系列色: 主色靛蓝、钢蓝、青绿、琥珀、灰紫，均控制在 35–55% 饱和度区间，避免与语义色冲突

## 4. 字体与节奏

- **font-display**: Inter —— 现代几何无衬线，数字与英文字形清晰，适配数据看板与商务场景
- **font-body**: Noto Sans SC —— 中文可读性强，笔画均匀，适合长时间表格阅读与表单填写
- **字号**: H1 text-2xl ~ text-3xl（页面标题）；H2 text-xl（区块标题）；body text-sm ~ text-base（后台偏紧凑）；muted text-xs ~ text-sm。
- **圆角**: 中 (rounded-md) —— 专业但不刻板，卡片与输入框一致，避免过圆显轻飘

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导；左导航 + 顶栏 + 主内容区为默认框架
- **Page / Section Order**: 数据看板 → 客户管理 → 联系人管理 → 商机管理 → 跟进记录 → 合同订单 → 统计报表 → 系统管理，与需求模块 1:1 对齐
- **Standard Content Zone**: 后台 `max-w-[1400px]` + `mx-auto`，确保表格与图表有充足横向空间
- **Shell / Frame Alignment**: 同宽 —— 内容区与顶栏内容同受 max-w 约束，左导航固定 240–260px 宽
- **Padding & Rhythm**: `px-4 md:px-6 lg:px-8 py-6 md:py-8`，卡片内 `p-5`，表格行 `py-3`，保持 4/8px 倍数
- **Full-bleed Zones**: 看板页统计卡片区、漏斗看板视图可接近内容区全宽；无真正全 bleed 区域
- **Local Narrowing**: 新增/编辑表单、个人设置、客户详情正文可收窄至 `max-w-3xl` 居中或左对齐
- **Overflow Strategy**: 客户列表、商机列表、合同列表等宽表使用 `overflow-x-auto`；漏斗看板横向列也用 `overflow-x-auto`
- **Flexibility Boundary**: 允许移动端导航折叠、卡片内边距与表格密度微调；不允许改变主色、圆角、阴影语言与全局 max-w

## 6. 视觉与动效

- **装饰**: 细线分隔、微浮起卡片、低调渐变顶部条
- **阴影/边界**: 轻 —— 卡片 `shadow-sm`，hover 时 `shadow-md`；弹层与下拉菜单 `shadow-md`
- **动效**: 克制 —— hover 背景过渡 150ms，页面切入场淡入 200ms，表格行与列表项轻微位移反馈；避免夸张弹性与缩放

## 7. 组件原则

- 按钮、输入、选择器、菜单项、表格行必须具备 Default / Hover / Active / Focus-visible / Disabled 状态
- Primary 只用于主行动按钮与当前导航项；次级操作用 outline/ghost；表格内操作以 icon + 文字或纯 icon 按钮
- 状态标签（客户分级、商机阶段、合同状态）采用浅底 + 深字 + 左边框或小圆点，避免大面积实色
- 空状态、加载态、错误态沿用同一卡片与图标风格，不回退到默认样式
- 表格使用斑马纹或悬停行高亮其一，不同时使用，保持视觉干净

## 8. Image Direction

- **Image Role**: 无强制图片需求，优先通过排版、图标、数据可视化与色彩层级建立专业感
- **Image Art Direction**: 无强制图片需求；若未来加入客户 logo 或头像，统一圆形/方角小圆、低饱和处理，避免喧宾夺主
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用商务人物握手图、城市天际线素材图、无意义渐变科技感背景图

## 9. Anti-patterns

- **Split personality**: 各模块各自为政，看板一套色、客户页一套色；全站共享同一套 primary / accent / border / 圆角 / 阴影
- **Phantom tokens**: 编造不存在的 CSS 变量；只使用 9 个基础 token 与语义色辅助类
- **Default SaaS drift**: 回到默认亮蓝按钮 + 紫色渐变卡片 + 无意义数据卡堆叠；用冷靛蓝主色 + 灰白底 + 细线分隔塑造 CRM 专属气质
- **Invisible interaction**: 只做 hover 不做 focus-visible；所有可交互元素必须有清晰的键盘聚焦环
- **Mono-hue tyranny**: 主色同时用于按钮、tab、icon、边框、链接、图表；严格按 65-25-10 比例分配，primary 仅承担 CTA 与关键状态
- **Status color drift**: 成功/警告/错误色饱和度过高、与主色冷暖脱节；语义色饱和度与 primary 对齐 ±15%，统一冷调基底
- **Density collapse**: 为了「好看」把表格行距拉得过大、统计卡片过高；CRM 是效率工具，信息密度优先，留白服务可读性而非装饰