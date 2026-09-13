"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi, paymentApi } from "@/lib/api/shop";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export function AdminRefundPanel({ orderId }: { orderId: number }) {
  const { t, errorMessage, statusLabel } = useI18n();
  const client = useQueryClient();
  const [input, setInput] = useState("");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const payment = useSessionQuery({
    queryKey: ["admin-refund-payment", paymentId],
    queryFn: () => paymentApi.get(paymentId!),
    enabled: paymentId !== null,
    retry: false,
    refetchInterval: (query) => ["PENDING", "UNKNOWN"].includes(query.state.data?.refundStatus ?? "") ? 3000 : false
  });
  const data = payment.data;
  const matchesOrder = data?.orderId === orderId;
  const failed = ["FAILED", "CANCELED"].includes(data?.refundStatus ?? "");
  const canRefund = matchesOrder && data?.status === "SUCCEEDED" && (!data.refundStatus || failed);
  const refund = useSessionMutation({
    mutationFn: async () => {
      if (!canRefund || !data) throw new Error(t("admin.refundLoadFirst"));
      if (failed) {
        if (!data.refundOperationKey) throw new Error(t("admin.refundManual"));
        return adminApi.retryRefundPayment(data.id, data.refundOperationKey);
      }
      return adminApi.refundPayment(data.id);
    },
    onSuccess: (result) => client.setQueryData(["admin-refund-payment", result.id], result),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["admin-refund-payment", paymentId] });
      client.invalidateQueries({ queryKey: ["admin-order", orderId] });
      client.invalidateQueries({ queryKey: ["admin-order-history", orderId] });
    }
  });
  const succeeded = matchesOrder && data?.status === "REFUNDED";
  const pending = matchesOrder && ["PENDING", "UNKNOWN"].includes(data?.refundStatus ?? "");

  return <div className="card stack">
    <h2 className="subtitle" style={{ margin: 0 }}>{t("admin.testRefund")}</h2>
    <p className="muted">{t("admin.refundHint")}</p>
    <form className="toolbar" style={{ alignItems: "flex-end" }} onSubmit={(event) => {
      event.preventDefault();
      const id = Number(input);
      if (Number.isSafeInteger(id) && id > 0) { refund.reset(); setPaymentId(id); }
    }}>
      <label className="label">{t("admin.paymentId")}<input className="input" type="number" min="1" step="1" required value={input} onChange={(event) => setInput(event.target.value)} disabled={refund.isPending} /></label>
      <button className="button" disabled={refund.isPending || !input}>{t("admin.loadPayment")}</button>
    </form>
    {payment.isFetching && !data ? <p role="status">{t("admin.loadingPayment")}</p> : null}
    {payment.error ? <p className="errorText" role="alert">{errorMessage(payment.error)}</p> : null}
    {data && !matchesOrder ? <p className="errorText" role="alert">{t("admin.paymentOtherOrder")}</p> : null}
    {matchesOrder ? <p>{t("admin.paymentStatus", { id: data.id, status: statusLabel(data.status) })}</p> : null}
    {succeeded ? <p className="status statusOk" role="status">{t("admin.refundConfirmed")}</p> : null}
    {pending ? <p className="status statusWarn" role="status">{t("admin.refundPending")}</p> : null}
    {matchesOrder && failed ? <p className="errorText" role="status">{t("admin.refundFailed")}</p> : null}
    {canRefund ? <button className="button buttonRed" disabled={refund.isPending || (failed && !data?.refundOperationKey)} onClick={() => refund.mutate()}>{refund.isPending ? t("admin.submitting") : failed ? t("admin.retryRefund") : t("admin.refundPayment")}</button> : null}
    {refund.error ? <p className="errorText" role="alert">{errorMessage(refund.error)}</p> : null}
  </div>;
}
