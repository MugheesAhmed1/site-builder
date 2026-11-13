import Link from "next/link";
import Icon from "@/components/Icon";
import "./doc-intake.css";

// A link band for the home page that points at the document intake.
export default function DocBand({ href = "/document" }: { href?: string }) {
  return (
    <Link className="doc-band" href={href}>
      <div>
        <h2>Have a requirements document?</h2>
        <p>Upload a PRD, a BRD or a plain brief. We read the name, the features, the prices, the common questions and the tone, and build the site from it. You check everything before it is built.</p>
        <span className="btn btn-primary">
          Start from a document
          <Icon name="arrow" size={16} />
        </span>
      </div>
      <div className="doc-band-art" aria-hidden="true">
        <span className="doc-sheet">
          <i />
          <i />
          <i style={{ width: "80%" }} />
          <i />
          <i style={{ width: "65%" }} />
          <i />
          <i style={{ width: "40%" }} />
        </span>
        <Icon name="arrow" size={22} />
        <span className="doc-site">
          <i />
          <i />
          <i style={{ width: "85%" }} />
          <i />
        </span>
      </div>
    </Link>
  );
}
