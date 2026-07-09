import Link from "next/link";

export default function Page() {
  return (
    <main className="page">
      <section className="brutal stack" style={{ padding: "40px 32px", justifyItems: "start", gap: 12 }}>
        <h1 className="title">Payment pending.</h1>
        <p className="subhead" style={{ margin: 0 }}>Open the bank app and confirm the payment.</p>
        <Link className="button" href="/orders">Orders</Link>
      </section>
    </main>
  );
}
