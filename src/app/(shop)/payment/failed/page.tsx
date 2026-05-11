import Link from "next/link";

export default function Page() {
  return (
    <main className="page">
      <section className="brutal stack" style={{ padding: 28 }}>
        <h1 className="title">Payment failed</h1>
        <p className="subhead muted">The payment was failed, canceled or expired.</p>
        <Link className="button" href="/orders">Orders</Link>
      </section>
    </main>
  );
}
