import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container center">
        <p className="eyebrow">Signal lost · 404</p>
        <h1>Off trajectory</h1>
        <p className="lede" style={{ margin: "0 auto 28px" }}>This page drifted out of range.</p>
        <Link href="/" className="btn btn-primary">Return home</Link>
      </div>
    </section>
  );
}
