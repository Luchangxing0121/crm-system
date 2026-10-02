// EXPORTS: 设备运维模块数据模型与初始数据
// 模块：设备、设备保险、人员、人员证书及行业保险、运维服务计划

export interface IEquipment {
  id: string;
  name: string;
  model: string;
  serialNo: string; // 设备序列号（必填）
  type: string; // 无人机 / 机巢 / 机场 / 其他
  location: string; // 所在区域/项目
  owner: string; // 联系人
  purchaseDate: string;
  status: '在用' | '停用' | '维修中';
  remark: string;
  createdAt: string;
}

export interface IInsurance {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: string; // 责任险 / 财产险 / 第三者险 等
  company: string; // 保险公司
  policyNo: string;
  amount: string; // 保额
  startDate: string;
  endDate: string; // 到期日期（预警用）
  remark: string;
}

export interface IStaff {
  id: string;
  name: string;
  position: string; // 岗位/角色
  phone: string;
  idCard: string;
  department: string; // 所属部门/项目
  status: '在职' | '离职';
  remark: string;
}

export interface IStaffCert {
  id: string;
  staffId: string;
  staffName: string;
  certName: string; // 证书名称：登高作业证 / 无人机驾驶员执照 等
  certNo: string;
  issuer: string; // 发证机构
  issueDate: string;
  expireDate: string; // 证书有效期（预警用）
  insType: string; // 行业保险：登高作业险 / 意外险 等
  insCompany: string;
  insAmount: string;
  insExpireDate: string; // 保险到期（预警用）
  remark: string;
}

export interface IServicePlan {
  id: string;
  quarter: string; // 2026-Q1
  title: string; // 计划名称
  equipmentId: string;
  equipmentName: string;
  content: string; // 服务内容
  owner: string; // 负责人
  planDate: string; // 计划日期
  status: '未开始' | '进行中' | '已完成' | '延期';
  remark: string;
}

export const EQUIPMENT_TYPES = ['无人机', '机巢', '机场', '其他'];
export const INSURANCE_TYPES = ['责任险', '财产险', '第三者责任险', '意外险', '其他'];
export const PLAN_QUARTERS = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];

export const MOCK_EQUIPMENT: IEquipment[] = [
  {
    id: 'eq-1001',
    name: '经纬 M350 RTK',
    model: 'M350 RTK',
    serialNo: 'M350-2024-0001',
    type: '无人机',
    location: '邵伯镇综合治理中心',
    owner: '张三',
    purchaseDate: '2026-03-01',
    status: '在用',
    remark: '主力巡检机',
    createdAt: '2026-01-01',
  },
  {
    id: 'eq-1002',
    name: '机巢-1号',
    model: 'DJI Dock 2',
    serialNo: 'DOCK2-2024-0002',
    type: '机巢',
    location: '邵伯镇综合治理中心',
    owner: '李四',
    purchaseDate: '2026-05-10',
    status: '在用',
    remark: '自动巡检基站',
    createdAt: '2026-01-01',
  },
];

export const MOCK_INSURANCE: IInsurance[] = [
  {
    id: 'ins-1001',
    equipmentId: 'eq-1001',
    equipmentName: 'M350 无人机',
    type: '第三者责任险',
    company: '中国人保',
    policyNo: 'PICC-2026-0088',
    amount: '¥2,000,000',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    remark: '',
  },
];

export const MOCK_STAFF: IStaff[] = [
  {
    id: 'st-1001',
    name: '张三',
    position: '飞行操作员',
    phone: '13800138001',
    idCard: '',
    department: '邵伯镇项目组',
    status: '在职',
    remark: '无人机驾驶员',
  },
  {
    id: 'st-1002',
    name: '李四',
    position: '设备维护员',
    phone: '13800138002',
    idCard: '',
    department: '邵伯镇项目组',
    status: '在职',
    remark: '登高作业',
  },
];

export const MOCK_STAFF_CERTS: IStaffCert[] = [
  {
    id: 'cert-1001',
    staffId: 'st-1001',
    staffName: '张三',
    certName: '无人机驾驶员执照',
    certNo: 'CAAC-2024-0101',
    issuer: '民航局',
    issueDate: '2024-01-15',
    expireDate: '2027-01-15',
    insType: '意外险',
    insCompany: '太平洋保险',
    insAmount: '¥500,000',
    insExpireDate: '2026-12-31',
    remark: '',
  },
  {
    id: 'cert-1002',
    staffId: 'st-1002',
    staffName: '李四',
    certName: '登高作业证',
    certNo: 'DG-2023-0506',
    issuer: '应急管理局',
    issueDate: '2023-05-06',
    expireDate: '2026-09-01',
    insType: '登高作业险',
    insCompany: '平安保险',
    insAmount: '¥300,000',
    insExpireDate: '2026-10-10',
    remark: '',
  },
];

export const MOCK_SERVICE_PLANS: IServicePlan[] = [
  {
    id: 'plan-1001',
    quarter: '2026-Q4',
    title: '季度设备巡检保养',
    equipmentId: 'eq-1001',
    equipmentName: 'M350 无人机',
    content: '例行巡检、电池健康检查、固件升级',
    owner: '张三',
    planDate: '2026-10-15',
    status: '进行中',
    remark: '',
  },
];