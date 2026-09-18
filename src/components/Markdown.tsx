/**
 * Rendu Markdown minimal en éléments React (titres, paragraphes, listes, citations, tableaux, code, gras, italique, liens).
 * Jamais de HTML brut injecté : le contenu est le nôtre, mais la règle vaut partout.
 */
import { Fragment, type ReactNode } from "react";

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("*")) out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    else {
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const href = mm[2]!;
      const external = /^https?:\/\//.test(href);
      out.push(<a key={k} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{mm[1]}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, skipFirstHeading = false }: { source: string; skipFirstHeading?: boolean }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, k = 0, skippedH1 = !skipFirstHeading;
  const para: string[] = [];
  const flush = () => {
    if (para.length) { blocks.push(<p key={k++}>{inline(para.join(" "), k)}</p>); para.length = 0; }
  };
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^\s*$/.test(line)) { flush(); i++; continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const level = h[1]!.length;
      if (level === 1 && !skippedH1) { skippedH1 = true; i++; continue; }
      const content = inline(h[2]!, k);
      blocks.push(level === 1 ? <h1 key={k++}>{content}</h1> : level === 2 ? <h2 key={k++}>{content}</h2> : <h3 key={k++}>{content}</h3>);
      i++; continue;
    }
    if (line.startsWith("```")) {
      flush();
      const code: string[] = []; i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) code.push(lines[i++]!);
      i++;
      blocks.push(<pre key={k++}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    if (line.startsWith(">")) {
      flush();
      const q: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) q.push(lines[i++]!.replace(/^>\s?/, ""));
      blocks.push(<blockquote key={k++}>{inline(q.join(" "), k)}</blockquote>);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]!) || /^\s*\d+\.\s+/.test(lines[i]!) || /^\s{2,}\S/.test(lines[i]!))) {
        const l = lines[i++]!;
        if (/^\s{2,}\S/.test(l) && items.length) items[items.length - 1] += " " + l.trim();
        else items.push(l.replace(/^\s*([-*]|\d+\.)\s+/, ""));
      }
      const li = items.map((it, j) => <li key={j}>{inline(it, k * 100 + j)}</li>);
      blocks.push(ordered ? <ol key={k++}>{li}</ol> : <ul key={k++}>{li}</ul>);
      continue;
    }
    if (line.startsWith("|")) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        const cells = lines[i++]!.split("|").slice(1, -1).map((c) => c.trim());
        if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
        rows.push(cells);
      }
      const [head, ...body] = rows;
      blocks.push(
        <table key={k++}>
          {head && <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, j)}</th>)}</tr></thead>}
          <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c, ri * 10 + j)}</td>)}</tr>)}</tbody>
        </table>,
      );
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flush();
  return <Fragment>{blocks}</Fragment>;
}
