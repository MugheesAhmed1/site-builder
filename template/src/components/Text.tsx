import { Fragment, type CSSProperties, type ElementType } from "react";

// Text primitives (PRD section 22, motion registry category "text"). The words stay real
// text: a headline split into words or letters still reads, selects and edits as one line,
// and without JavaScript it simply shows.

type Split = "none" | "words" | "chars";

export function splitOf(primitive: string): Split {
  if (primitive === "text.plain") return "none";
  if (primitive === "text.chars" || primitive === "text.split" || primitive === "text.scramble") return "chars";
  return "words";
}

export function Headline({ as = "h2", text, primitive, className, style }: { as?: ElementType; text: string; primitive: string; className?: string; style?: CSSProperties }) {
  const Tag = as;
  const split = splitOf(primitive);
  const kind = primitive.replace(/^text\./, "");
  if (split === "none" || !text) {
    return (
      <Tag className={className} data-text={kind} style={style}>
        {text}
      </Tag>
    );
  }
  const words = text.split(/(\s+)/);
  let w = 0;
  let c = 0;
  return (
    <Tag className={className} data-text={kind} data-enter="text" style={style}>
      {words.map((word, i) => {
        if (/^\s+$/.test(word)) return <Fragment key={i}>{" "}</Fragment>;
        const wi = w++;
        if (split === "words")
          return (
            <span key={i} className="xp-w" style={{ ["--w" as string]: wi }}>
              <span>{word}</span>
            </span>
          );
        return (
          <span key={i} className="xp-w">
            {[...word].map((ch, k) => (
              <span key={k} className="xp-c" style={{ ["--c" as string]: Math.min(40, c++) }}>
                {ch}
              </span>
            ))}
          </span>
        );
      })}
    </Tag>
  );
}
