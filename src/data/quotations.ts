// EXPORTS: IQuotation, IQuotationItem, QUOTATION_STATUS, MOCK_QUOTATIONS, TAX_RATES
import type { IAttachment } from './opportunities'

export interface IQuotationItem {
  id: string
  productId: string
  productName: string
  brand: string
  sku: string
  unit: string
  quantity: number
  unitPrice: number
  channelPrice: number
  discount: number
  subtotal: number
  remark?: string
}

export interface IQuotation {
  id: string
  quotationNo: string
  name: string
  customerId: string
  opportunityId?: string
  projectId?: string
  contactId?: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  quotationDate: string
  validUntil: string
  owner: string
  taxRate: number
  items: IQuotationItem[]
  subtotal: number
  taxAmount: number
  total: number
  remark: string
  attachments: IAttachment[]
  createdAt: string
}

export const QUOTATION_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  sent: { label: '已发送', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  accepted: { label: '已接受', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: '已拒绝', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  expired: { label: '已过期', color: 'bg-amber-100 text-amber-700 border-amber-200' },
}

export const TAX_RATES = [0, 0.03, 0.06, 0.09, 0.13]

export const MOCK_QUOTATIONS: IQuotation[] = [];

