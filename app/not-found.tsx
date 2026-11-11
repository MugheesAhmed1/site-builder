import Link from "next/link";
import Topbar from "@/components/Topbar";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <Topbar />
      <main className="page" style={{ paddingTop: 64 }}>
        <div>
          <h1>This page doesn&apos;t exist</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            The link may be old, or the site was built in a different browser. Sites you build are saved in the browser you built them in.
          </p>
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" href="/">
              Go to the start
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
