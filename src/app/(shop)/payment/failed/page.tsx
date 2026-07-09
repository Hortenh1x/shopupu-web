import Link from "next/link";

export default function Page() {
  return (
    <main className="page">
      <section className="brutal stack" style={{ padding: "40px 32px", justifyItems: "start", gap: 12 }}>
        <h1 className="title">Payment failed.</h1>
        <p className="subhead" style={{ margin: 0 }}>The payment failed, was canceled or expired. You can retry from the order.</p>
        <Link className="button" href="/orders">Orders</Link>
      </section>
    </main>
  );
}
