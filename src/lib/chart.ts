/** Nhãn trục biểu đồ gọn (tránh 000000 / chồng chữ trên desktop & mobile). */
export function formatChartAxisVnd(value: number): string {
  const v = Math.abs(Number(value));
  if (!Number.isFinite(v)) {
    return "0";
  }
  if (v >= 1_000_000_000) {
    return `${(v / 1_000_000_000).toFixed(1)}B`;
  }
  if (v >= 1_000_000) {
    return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  }
  if (v >= 1_000) {
    return `${Math.round(v / 1_000)}K`;
  }
  return String(Math.round(v));
}
