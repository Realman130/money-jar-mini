import { parseVietnameseDateHint, todayISODate } from "./date";
import { parseAmountToken } from "./money";
import type { CategoryRow, ParsedQuick, ParsedThuChi, ParsedTransfer, TransactionType, WalletRow } from "@/types/domain";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

const INCOME_HINTS = [
  "luong",
  "thuong",
  "nhan tien",
  "nhan ",
  "duoc tang",
  "hoan tien",
  "ban do",
  "tien lai",
  "lai tien gui",
  "lai gui",
  "lai ki gui",
  "thu nhap",
  "hoa hong"
];

const EXPENSE_PRIORITY_HINTS = [
  "lai vay",
  "tra lai",
  "chi lai",
  "chi tien lai",
  "tra tien lai",
  "tra no",
  "thanh toan lai",
  "thanh toan no",
  "phai tra lai",
  "phai tra no",
  "no lai"
];

const EXPENSE_HINTS = [
  "an ",
  "uong",
  "mua ",
  "tra ",
  "dong ",
  "di ",
  "xang",
  "cafe",
  "ca phe",
  "grab",
  "cf ",
  "phi ",
  "chi phi"
];

function inferType(noteNorm: string): TransactionType {
  if (EXPENSE_PRIORITY_HINTS.some((h) => noteNorm.includes(h))) {
    return "chi";
  }
  if (INCOME_HINTS.some((h) => noteNorm.includes(h))) {
    return "thu";
  }
  if (EXPENSE_HINTS.some((h) => noteNorm.includes(h))) {
    return "chi";
  }
  return "chi";
}

function extractAmountSegment(line: string): { amount: number; before: string; after: string } | null {
  const re = /(\d+(?:[.,]\d+)?)\s*(k|nghin|nghìn|tr|trieu|triệu|m)?/i;
  const m = line.match(re);
  if (!m || m.index === undefined) {
    return null;
  }
  const amt = parseAmountToken(m[1], m[2] ?? "");
  if (amt == null) {
    return null;
  }
  const before = line.slice(0, m.index).trim();
  const after = line.slice(m.index + m[0].length).trim();
  return { amount: amt, before, after };
}

const WALLET_WORDS: { code: string; needles: string[] }[] = [
  { code: "cash", needles: ["tm", "tien mat", "cash", "tiền mặt"] },
  { code: "bank", needles: ["bank", "ck", "chuyen khoan", "chuyển khoản", "ngan hang", "ngân hàng"] },
  { code: "momo", needles: ["momo"] },
  { code: "saving", needles: ["tiet kiem", "tiết kiệm", "saving", "tk"] },
  { code: "investment", needles: ["dau tu", "đầu tư", "investment"] }
];

function resolveWalletCodeFromText(fragment: string): string | null {
  const n = normalize(fragment);
  for (const w of WALLET_WORDS) {
    for (const needle of w.needles) {
      if (n.includes(needle) || n === needle) {
        return w.code;
      }
    }
  }
  return null;
}

function pickWalletCodeFromFragment(fragment: string): string | null {
  return resolveWalletCodeFromText(fragment);
}

function resolveCategory(
  note: string,
  categories: CategoryRow[],
  aliasToCategoryId: Map<string, string>,
  type: TransactionType
): { id: string | null; name: string | null } {
  const n = normalize(note);
  const pool = categories.filter((c) => c.is_active && c.type === type);
  let best: { id: string; len: number; name: string } | null = null;

  for (const c of pool) {
    const nameN = normalize(c.name);
    if (nameN.length >= 2 && n.includes(nameN)) {
      if (!best || nameN.length > best.len) {
        best = { id: c.id, len: nameN.length, name: c.name };
      }
    }
  }

  for (const [al, cid] of aliasToCategoryId) {
    const c = pool.find((x) => x.id === cid);
    if (!c) {
      continue;
    }
    const an = normalize(al);
    if (an.length < 2 || !n.includes(an)) {
      continue;
    }
    if (!best || an.length > best.len) {
      best = { id: c.id, len: an.length, name: c.name };
    }
  }

  if (best) {
    return { id: best.id, name: best.name };
  }
  const fallback =
    type === "chi"
      ? pool.find((c) => c.parent_name === "Khác" && c.name === "Chưa phân loại")
      : pool.find((c) => c.name === "Thu nhập khác");
  return { id: fallback?.id ?? null, name: fallback?.name ?? (type === "chi" ? "Chưa phân loại" : "Thu nhập khác") };
}

function tryTransfer(
  combined: string,
  amount: number,
  transaction_date: string,
  _wallets: WalletRow[],
  originalRaw: string
): ParsedTransfer | null {
  const rest = combined.replace(/\s+/g, " ").trim();
  const m1 = rest.match(/^(?:chuyển|chuyen)\s+(.+?)\s+sang\s+(.+)$/i);
  const m2 = rest.match(/^(?:rút|rut)\s+(.+?)\s+sang\s+(.+)$/i);
  const m3 = rest.match(/^(?:nạp|nap)\s+(.+?)\s+từ\s+(.+)$/i);
  const m = m1 || m2 || m3;
  if (!m) {
    return null;
  }
  let fromCode: string | null;
  let toCode: string | null;
  if (m3) {
    toCode = resolveWalletCodeFromText(m[1]);
    fromCode = resolveWalletCodeFromText(m[2]);
  } else {
    fromCode = resolveWalletCodeFromText(m[1]);
    toCode = resolveWalletCodeFromText(m[2]);
  }
  if (!fromCode || !toCode || fromCode === toCode) {
    return null;
  }
  return {
    kind: "transfer",
    amount,
    fee_amount: 0,
    fromWalletCode: fromCode,
    toWalletCode: toCode,
    note: rest,
    transaction_date,
    raw: originalRaw
  };
}

export function parseQuickInput(
  raw: string,
  ctx: {
    categories: CategoryRow[];
    aliasToCategoryId: Map<string, string>;
    wallets: WalletRow[];
  }
): ParsedQuick | { error: string } {
  let line = raw.trim();
  if (!line) {
    return { error: "Nhập nội dung giao dịch." };
  }

  let transaction_date = todayISODate();
  const dh = parseVietnameseDateHint(line);
  if (dh) {
    transaction_date = dh.date;
    line = dh.stripped;
  }

  const seg = extractAmountSegment(line);
  if (!seg) {
    return {
      error: "Chưa nhận diện được số tiền. Ví dụ: 35k, 1tr2, 120.000"
    };
  }

  const { amount, before, after } = seg;
  const combined = `${before} ${after}`.replace(/\s+/g, " ").trim();

  const tr = tryTransfer(combined, amount, transaction_date, ctx.wallets, raw);
  if (tr) {
    return tr;
  }

  const type = inferType(normalize(combined));
  const walletCode = pickWalletCodeFromFragment(after) ?? pickWalletCodeFromFragment(before) ?? defaultWalletCodeForType();
  const noteRaw =
    [before, after.replace(/\b(tm|bank|momo|cash|saving|investment|tiết kiệm|tiet kiem|ngân hàng|ngan hang)\b/gi, "")]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim() ||
    before ||
    after;

  const cat = resolveCategory(noteRaw, ctx.categories, ctx.aliasToCategoryId, type);

  const out: ParsedThuChi = {
    kind: "thu_chi",
    type,
    amount,
    note: noteRaw || raw,
    transaction_date,
    walletCode,
    categoryId: cat.id,
    categoryName: cat.name,
    raw
  };

  return out;
}

export function defaultWalletCodeForType(): string {
  return "bank";
}
