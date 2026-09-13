"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import type { ReviewSource } from "@/lib/api/types";

export function ReviewSourceBadge({ source }: { source?: ReviewSource }) {
  const { t } = useI18n();
  return <span className="status statusBrand">{source === "SYNTHETIC_DEMO"
    ? t("review.synthetic")
    : source === "CUSTOMER_SUBMITTED" ? t("review.participant") : t("review.unknown")}</span>;
}
