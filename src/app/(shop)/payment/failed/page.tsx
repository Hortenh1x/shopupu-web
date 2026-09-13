import { redirect } from "next/navigation";

// A return URL cannot establish payment status; the order links to its verified payment record.
export default function Page() {
  redirect("/orders");
}
