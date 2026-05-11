import { PaymentStatusPage } from "@/features/payments/PaymentStatusPage";

export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  return <PaymentStatusPage paymentId={Number(paymentId)} />;
}
