import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { CreatePaymentPage } from "@/features/payments/CreatePaymentPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="page"><Skeleton /></div>}>
      <CreatePaymentPage />
    </Suspense>
  );
}
