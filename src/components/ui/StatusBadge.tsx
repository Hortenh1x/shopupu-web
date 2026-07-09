const OK = new Set(["PAID", "DELIVERED", "COMPLETED", "APPROVED", "SUCCEEDED"]);
const WARN = new Set(["CREATED", "PENDING_PAYMENT", "PENDING", "PROCESSING"]);
const BRAND = new Set(["SHIPPED", "REFUNDED"]);
const DANGER = new Set(["CANCELLED", "CANCELED", "REJECTED", "FAILED", "EXPIRED", "DELETED"]);

export function StatusBadge({ value }: { value: string }) {
  const tone = OK.has(value)
    ? "statusOk"
    : DANGER.has(value)
      ? "statusDanger"
      : WARN.has(value)
        ? "statusWarn"
        : BRAND.has(value)
          ? "statusBrand"
          : "";
  return <span className={`status ${tone}`.trim()}>{value.toLowerCase().replaceAll("_", " ")}</span>;
}
