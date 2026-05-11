import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { CatalogPage } from "@/features/catalog/CatalogPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="page"><Skeleton lines={5} /></div>}>
      <CatalogPage />
    </Suspense>
  );
}
