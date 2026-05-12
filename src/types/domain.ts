export type TransactionType = "thu" | "chi";
export type WalletKind = "cash" | "bank" | "ewallet" | "credit_card" | "saving" | "investment" | "other";
export type TxSource = "manual" | "quick_text" | "voice" | "import" | "recurring";

export interface CategoryRow {
  id: string;
  type: TransactionType;
  parent_name: string;
  name: string;
  icon: string;
  color: string;
  jar_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface WalletRow {
  id: string;
  telegram_user_id: number;
  code: string;
  name_vi: string;
  kind: WalletKind;
  opening_balance: number;
  sort_order: number;
  is_active: boolean;
}

export interface JarRow {
  id: string;
  code: string;
  name_vi: string;
  target_percent: number;
  sort_order: number;
}

export interface TransactionRow {
  id: string;
  telegram_user_id: number;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  wallet_id: string | null;
  note: string;
  raw_input: string;
  transaction_date: string;
  source: TxSource;
  merchant: string | null;
  tags: string[];
  created_at: string;
  deleted_at: string | null;
}

export interface TransferRow {
  id: string;
  telegram_user_id: number;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  fee_amount: number;
  transfer_date: string;
  note: string;
  raw_input: string;
  deleted_at: string | null;
}

export type ParsedKind = "thu_chi" | "transfer";

export interface ParsedThuChi {
  kind: "thu_chi";
  type: TransactionType;
  amount: number;
  note: string;
  transaction_date: string;
  walletCode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  raw: string;
}

export interface ParsedTransfer {
  kind: "transfer";
  amount: number;
  fee_amount: number;
  fromWalletCode: string | null;
  toWalletCode: string | null;
  note: string;
  transaction_date: string;
  raw: string;
}

export type ParsedQuick = ParsedThuChi | ParsedTransfer;

export interface MonthlySummaryRow {
  telegram_user_id: number;
  month_date: string;
  total_income: number;
  total_expense: number;
  net_amount: number;
  saving_rate_percent: number | null;
}
