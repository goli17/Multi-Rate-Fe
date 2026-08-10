export type DiscountType = 'none' | 'percent' | 'fixed';
export type DocumentStatus = 'draft' | 'finalized';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountPercent: number | null;
  discountFixed: number | null;
  taxPercent: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Document {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  currency: string;
  status: DocumentStatus;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  lineItems: LineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  currency: string;
  status: DocumentStatus;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

export interface LineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discountType?: DiscountType;
  discountPercent?: number;
  discountFixed?: number;
  taxPercent?: number;
}

export interface SummaryReportDocument {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  currency: string;
  status: string;
  grandTotal: number;
  totalTax: number;
  totalDiscount: number;
}

export interface CurrencyTotals {
  currency: string;
  documentCount: number;
  sumGrandTotals: number;
  sumTotalTax: number;
  sumTotalDiscount: number;
}

export interface SummaryReport {
  from: string;
  to: string;
  /** Empty = all currencies (no filter). */
  currencies: string[];
  documentCount: number;
  totalsByCurrency: CurrencyTotals[];
  documents: SummaryReportDocument[];
}
