"use client";

import Icon from "@/components/Icon";
import type { Coverage } from "@/lib/prd-coverage";
import "./prd.css";

// What the coverage check found: every PRD section and requirement, ticked when it is on the page.
export default function CoverageList({ cov, compact = false }: { cov: Coverage; compact?: boolean }) {
  const bad = cov.requirements.filter((r) => !r.ok);
  return (
    <div className="cov" role="status">
      <p className={"cov-head " + (cov.ok ? "is-ok" : "is-bad")}>
        <Icon name={cov.ok ? "check" : "x"} size={16} />
        {cov.ok ? `All ${cov.sections.length} PRD sections and ${cov.requirements.length} requirements are on the site.` : `${cov.problems.length} PRD item${cov.problems.length === 1 ? " is" : "s are"} missing from the site.`}
      </p>
      <ul>
        {(compact ? (bad.length ? bad : []) : cov.requirements).map((r) => (
          <li key={r.id} className={r.ok ? "" : "is-bad"}>
            <span className="mono">{r.id}</span>
            <span>
              {r.label}
              {!r.ok && <b> ({r.reason})</b>}
            </span>
          </li>
        ))}
        {cov.sections
          .filter((s) => !s.ok)
          .map((s) => (
            <li key={"s-" + s.id} className="is-bad">
              <span className="mono">§</span>
              <span>
                {s.label} <b>({s.reason})</b>
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
