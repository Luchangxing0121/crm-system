// EXPORTS: IContract, MOCK_CONTRACTS
export interface IPaymentPlanItem {
  id: string
  period: number
  amount: number
  plannedDate: string
  actualDate?: string
  status: 'pending' | 'paid' | 'overdue'
}

export interface IContract {
  id: string
  contractNo: string
  customerId: string
  opportunityId?: string
  amount: number
  signDate: string
  effectiveDate: string
  status: 'pending' | 'active' | 'completed' | 'void'
  paymentPlan: IPaymentPlanItem[]
  owner: string
  remark: string
  createdAt: string
}

export const MOCK_CONTRACTS: IContract[] = [];
