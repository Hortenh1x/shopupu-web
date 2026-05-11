import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShippingPage } from "@/features/shipping/ShippingPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="page"><Skeleton /></div>}>
      <ShippingPage />
    </Suspense>
  );
}
