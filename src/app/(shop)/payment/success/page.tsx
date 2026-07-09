import Link from "next/link";

export default function Page() {
  return (
    <main className="page">
      <section className="brutal stack" style={{ padding: "40px 32px", justifyItems: "start", gap: 12 }}>
        <h1 className="title">Payment <span className="mark">succeeded</span>.</h1>
        <p className="subhead" style={{ margin: 0 }}>The bank callback was accepted and the order should now be paid.</p>
        <Link className="button buttonDark" href="/orders">Open orders</Link>
      </section>
    </main>
  );
}
