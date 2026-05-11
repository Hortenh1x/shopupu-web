import Link from "next/link";

export default function Page() {
  return (
    <main className="page">
      <section className="brutal stack" style={{ padding: 28 }}>
        <h1 className="title">Payment succeeded</h1>
        <p className="subhead muted">The bank callback was accepted and the order should now be paid.</p>
        <Link className="button buttonDark" href="/orders">Open orders</Link>
      </section>
    </main>
  );
}
