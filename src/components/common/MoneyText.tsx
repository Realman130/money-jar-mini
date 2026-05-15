import { formatVnd } from "@/lib/money";

export function MoneyText({
  amount,
  type = "neutral",
  signed
}: {
  amount: number;
  type?: "income" | "expense" | "neutral";
  signed?: boolean;
}) {
  const cls =
    type === "income" ? "text-mjm-income" : type === "expense" ? "text-mjm-expense" : "text-mjm-text";
  return <span className={`font-semibold tabular-nums tracking-[-0.02em] ${cls}`}>{formatVnd(amount, { signed })}</span>;
}
