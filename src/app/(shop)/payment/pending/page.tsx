import Link from "next/link";

export default function Page() {
  return (
    <main className="page">
      <section className="brutal stack" style={{ padding: 28 }}>
        <h1 className="title">Payment pending</h1>
        <p className="subhead muted">Open the bank app and confirm the payment.</p>
        <Link className="button" href="/orders">Orders</Link>
      </section>
    </main>
  );
}
