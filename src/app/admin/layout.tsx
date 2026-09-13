import type { ReactNode } from "react";
import { Protected } from "@/components/layout/Protected";

export default function Layout({ children }: { children: ReactNode }) {
  return <Protected adminOnly>{children}</Protected>;
}
