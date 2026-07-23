import React from "react";

/** Minimal, dependency-free markdown renderer tuned for clinical notes:
 *  headings, bold, bullet & numbered lists, blockquotes and tables. */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <strong key={`${keyBase}-b-${i++}`} style={{ color: "var(--text-bright)", fontWeight: 700 }}>
        {m[1]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const textStyle: React.CSSProperties = {
    fontSize: 13.5,
    lineHeight: 1.65,
    color: "var(--text-soft)",
    margin: "0 0 10px",
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push(
        <div key={key++} style={{ fontSize: 13, fontWeight: 700, color: "var(--text-bright)", margin: "12px 0 6px" }}>
          {inline(line.slice(4), `h3-${key}`)}
        </div>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <div key={key++} style={{ fontSize: 15, fontWeight: 800, color: "var(--text-bright)", letterSpacing: "-0.2px", margin: "2px 0 10px" }}>
          {inline(line.slice(3), `h2-${key}`)}
        </div>
      );
      i++;
      continue;
    }

    // Blockquote (used for time-critical callouts)
    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <div
          key={key++}
          style={{
            borderLeft: "3px solid var(--amber)",
            background: "rgba(245,158,11,0.08)",
            padding: "10px 14px",
            borderRadius: 8,
            margin: "0 0 12px",
            fontSize: 13,
            color: "var(--amber-soft)",
            fontWeight: 600,
          }}
        >
          {inline(quote.join(" "), `q-${key}`)}
        </div>
      );
      continue;
    }

    // Table
    if (line.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      const parse = (r: string) => r.split("|").slice(1, -1).map((c) => c.trim());
      const header = parse(rows[0]);
      const body = rows.slice(2).map(parse); // skip separator row
      blocks.push(
        <div key={key++} style={{ overflowX: "auto", margin: "0 0 12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {header.map((h, hi) => (
                  <th
                    key={hi}
                    style={{
                      textAlign: hi === 0 ? "left" : "right",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      padding: "6px 10px",
                      borderBottom: "1px solid var(--border-strong)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => (
                    <td
                      key={ci}
                      className="tabular"
                      style={{
                        textAlign: ci === 0 ? "left" : "right",
                        color: ci === 0 ? "var(--text-soft)" : "var(--text-bright)",
                        fontWeight: ci === 0 ? 500 : 600,
                        padding: "6px 10px",
                        borderBottom: "1px solid var(--border-faint)",
                      }}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} style={{ margin: "0 0 12px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-soft)" }}>
              {inline(it, `ol-${key}-${ii}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} style={{ margin: "0 0 12px", paddingLeft: 4, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ display: "flex", gap: 9, fontSize: 13.5, lineHeight: 1.55, color: "var(--text-soft)" }}>
              <span style={{ color: "var(--teal)", marginTop: 1, flex: "none" }}>•</span>
              <span>{inline(it, `ul-${key}-${ii}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph
    blocks.push(
      <p key={key++} style={textStyle}>
        {inline(line, `p-${key}`)}
      </p>
    );
    i++;
  }

  return <div>{blocks}</div>;
}
